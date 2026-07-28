using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using CarSales.Api.Data;
using CarSales.Api.Models;

namespace CarSales.Api.Services;

public class VehicleImageMatchingService : IVehicleImageMatchingService
{
    private readonly ApplicationDbContext _context;
    private readonly IDropboxService _dropboxService;
    private readonly IImageEmbeddingService _embeddingService;
    private readonly IVectorSimilarityService _similarityService;
    private readonly AiKernelService _aiKernel;
    private readonly ILogger<VehicleImageMatchingService> _logger;

    private readonly double _highConfidenceThreshold;
    private readonly double _reviewThreshold;

    public VehicleImageMatchingService(
        ApplicationDbContext context,
        IDropboxService dropboxService,
        IImageEmbeddingService embeddingService,
        IVectorSimilarityService similarityService,
        AiKernelService aiKernel,
        IConfiguration configuration,
        ILogger<VehicleImageMatchingService> logger)
    {
        _context = context;
        _dropboxService = dropboxService;
        _embeddingService = embeddingService;
        _similarityService = similarityService;
        _aiKernel = aiKernel;
        _logger = logger;

        // Load configuration thresholds with fallback defaults
        _highConfidenceThreshold = double.TryParse(configuration["ImageMatching:HighConfidenceThreshold"], out var hc) ? hc : 0.88;
        _reviewThreshold = double.TryParse(configuration["ImageMatching:ReviewThreshold"], out var r) ? r : 0.75;
    }

    public async Task<VehicleMatchResult> MatchVehicleAsync(string vin, CancellationToken cancellationToken)
    {
        var requestId = Guid.NewGuid();
        var normalizedVin = vin.Trim().ToUpperInvariant();
        _logger.LogInformation("Starting vehicle image match request {RequestId} for VIN: {Vin}", requestId, normalizedVin);

        // 1. Find application vehicle
        var car = await _context.Cars
            .Include(c => c.Inventory)
            .FirstOrDefaultAsync(c => c.Vin == normalizedVin, cancellationToken);

        if (car == null)
        {
            var failedResult = new VehicleMatchResult
            {
                RequestId = requestId.ToString(),
                Vin = normalizedVin,
                Status = "FAILED",
                ErrorMessage = $"Vehicle with VIN '{normalizedVin}' not found in the application database."
            };
            await SaveMatchRequestAsync(failedResult, null, cancellationToken);
            return failedResult;
        }

        // Create match request placeholder in DB
        var requestRecord = new VehicleMatchRequest
        {
            Id = requestId,
            Vin = normalizedVin,
            CarId = car.Id,
            Status = "PROCESSING",
            CreatedAt = DateTime.UtcNow
        };
        _context.VehicleMatchRequests.Add(requestRecord);
        await _context.SaveChangesAsync(cancellationToken);

        try
        {
            // 2. Lookup & sync Dropbox folder
            var folderPath = await _dropboxService.FindVinFolderAsync(normalizedVin, cancellationToken);
            if (string.IsNullOrEmpty(folderPath))
            {
                var failedResult = new VehicleMatchResult
                {
                    RequestId = requestId.ToString(),
                    Vin = normalizedVin,
                    Status = "FAILED",
                    ErrorMessage = $"No Dropbox folder found for Chassis/VIN: {normalizedVin}."
                };
                await UpdateRequestStatusAsync(requestId, "FAILED", failedResult.ErrorMessage);
                return failedResult;
            }

            // Sync folder metadata in database
            var dbVehicle = await SyncDropboxFolderMetadataAsync(normalizedVin, folderPath, cancellationToken);

            // Fetch Dropbox images and ensure all of them have cached embeddings
            var dropboxImages = await EnsureDropboxEmbeddingsAsync(dbVehicle, cancellationToken);
            if (!dropboxImages.Any())
            {
                var failedResult = new VehicleMatchResult
                {
                    RequestId = requestId.ToString(),
                    Vin = normalizedVin,
                    Status = "FAILED",
                    ErrorMessage = $"Dropbox folder for VIN '{normalizedVin}' exists but contains no image files."
                };
                await UpdateRequestStatusAsync(requestId, "FAILED", failedResult.ErrorMessage);
                return failedResult;
            }

            // 3. Process application reference images and fetch/cache their embeddings
            var appImages = car.Images ?? new List<string>();
            var appEmbeddings = await EnsureApplicationEmbeddingsAsync(appImages, cancellationToken);

            if (!appEmbeddings.Any())
            {
                var failedResult = new VehicleMatchResult
                {
                    RequestId = requestId.ToString(),
                    Vin = normalizedVin,
                    Status = "FAILED",
                    ErrorMessage = "The registered vehicle has no reference images inside the database."
                };
                await UpdateRequestStatusAsync(requestId, "FAILED", failedResult.ErrorMessage);
                return failedResult;
            }

            // 4. Perform pairwise matching
            var matchDetails = new List<ImageMatchDetail>();
            int reviewCount = 0;
            int matchedCount = 0;

            foreach (var appImg in appEmbeddings)
            {
                var appVector = appImg.Embedding;
                ImageMatchDetail? bestMatch = null;
                DropboxImage? bestDbImg = null;

                foreach (var dbImg in dropboxImages)
                {
                    if (dbImg.Embedding == null) continue;

                    var similarity = _similarityService.CalculateCosineSimilarity(appVector, dbImg.Embedding);
                    if (bestMatch == null || similarity > bestMatch.Similarity)
                    {
                        string decision = "REVIEW";
                        if (similarity >= _highConfidenceThreshold) decision = "MATCH";
                        else if (similarity < _reviewThreshold) decision = "NO_MATCH";

                        bestMatch = new ImageMatchDetail
                        {
                            ApplicationImage = appImg.Url,
                            DropboxImageName = dbImg.FileName,
                            DropboxImagePath = dbImg.PathDisplay,
                            Similarity = similarity,
                            Decision = decision
                        };
                        bestDbImg = dbImg;
                    }
                }

                if (bestMatch != null && bestDbImg != null)
                {
                    // 5. Trigger secondary Gemini vision explainer for borderline REVIEW cases
                    if (bestMatch.Decision == "REVIEW" && string.Equals(_aiKernel.GetProvider(), "Gemini", StringComparison.OrdinalIgnoreCase))
                    {
                        try
                        {
                            _logger.LogInformation("Triggering secondary Gemini Vision explanation for borderline match: {Similarity}", bestMatch.Similarity);
                            var appBytes = await DownloadWebImageAsync(bestMatch.ApplicationImage);
                            var dbBytes = await _dropboxService.DownloadImageAsync(bestMatch.DropboxImagePath, cancellationToken);

                            if (appBytes != null && dbBytes != null)
                            {
                                var prompt = $@"Compare these two vehicle images:
Image 1: Reference image of {car.Brand} {car.Model} ({car.Color}).
Image 2: Uploaded photo from Dropbox.

State clearly if they match and why. Be concise (2-3 sentences). Highlight any differences in modifications, damage, or wheels.";
                                
                                var explanation = await _aiKernel.RunVisionMultiImageAsync(prompt, appBytes, "image/jpeg", new List<(byte[] Bytes, string MimeType)> { (dbBytes, "image/jpeg") });
                                bestMatch.Explanation = explanation;
                            }
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to generate secondary Gemini explanation.");
                            bestMatch.Explanation = "Visual comparison pending manual inspector verification.";
                        }
                    }
                    else if (bestMatch.Decision == "MATCH")
                    {
                        bestMatch.Explanation = "High-confidence visual embedding similarity match.";
                        matchedCount++;
                    }
                    else
                    {
                        bestMatch.Explanation = "Low visual similarity score. Manual review recommended.";
                        reviewCount++;
                    }

                    matchDetails.Add(bestMatch);

                    // Save Image Match Record to database
                    var imageMatchRecord = new VehicleImageMatch
                    {
                        MatchRequestId = requestId,
                        VehicleImageId = bestMatch.ApplicationImage,
                        DropboxImageId = bestDbImg.Id,
                        SimilarityScore = bestMatch.Similarity,
                        Decision = bestMatch.Decision,
                        CreatedAt = DateTime.UtcNow
                    };
                    _context.VehicleImageMatches.Add(imageMatchRecord);
                }
            }

            // 6. Calculate overall decision
            double overallScore = matchDetails.Any() ? matchDetails.Average(m => m.Similarity) : 0.0;
            string overallDecision = "REVIEW";
            string confidence = "MEDIUM";

            if (matchDetails.Any(m => m.Decision == "NO_MATCH"))
            {
                overallDecision = "NO_MATCH";
                confidence = "LOW";
            }
            else if (matchDetails.All(m => m.Decision == "MATCH"))
            {
                overallDecision = "MATCH";
                confidence = "HIGH";
            }

            var finalResult = new VehicleMatchResult
            {
                RequestId = requestId.ToString(),
                Vin = normalizedVin,
                Status = "COMPLETED",
                OverallScore = overallScore,
                Confidence = confidence,
                Decision = overallDecision,
                ApplicationImageCount = appImages.Count,
                DropboxImageCount = dropboxImages.Count,
                MatchedImageCount = matchedCount,
                ReviewRequiredCount = matchDetails.Count(m => m.Decision == "REVIEW"),
                Matches = matchDetails
            };

            // Update request record in database
            requestRecord.Status = "COMPLETED";
            requestRecord.OverallScore = overallScore;
            requestRecord.Decision = overallDecision;
            requestRecord.Confidence = confidence;
            requestRecord.CompletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return finalResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during vehicle matching verification flow.");
            var errorMsg = $"Verification process failed: {ex.Message}";
            await UpdateRequestStatusAsync(requestId, "FAILED", errorMsg);

            return new VehicleMatchResult
            {
                RequestId = requestId.ToString(),
                Vin = normalizedVin,
                Status = "FAILED",
                ErrorMessage = errorMsg
            };
        }
    }

    private async Task<DropboxVehicle> SyncDropboxFolderMetadataAsync(string vin, string folderPath, CancellationToken cancellationToken)
    {
        var dbVehicle = await _context.DropboxVehicles
            .Include(v => v.Images)
            .FirstOrDefaultAsync(v => v.Vin == vin, cancellationToken);

        var folderParts = folderPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var dealer = folderParts.Length > 1 ? folderParts[1] : "Unknown Dealer";
        var dateFolder = folderParts.Length > 2 ? folderParts[2] : "Default";

        if (dbVehicle == null)
        {
            dbVehicle = new DropboxVehicle
            {
                Vin = vin,
                Dealer = dealer,
                FolderPath = folderPath,
                DateFolder = dateFolder,
                LastSyncedAt = DateTime.UtcNow
            };
            _context.DropboxVehicles.Add(dbVehicle);
        }
        else
        {
            dbVehicle.FolderPath = folderPath;
            dbVehicle.Dealer = dealer;
            dbVehicle.DateFolder = dateFolder;
            dbVehicle.LastSyncedAt = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var cloudImages = await _dropboxService.GetVehicleImagesAsync(folderPath, cancellationToken);
        var existingImages = dbVehicle.Images.ToList();

        foreach (var img in cloudImages)
        {
            var existing = existingImages.FirstOrDefault(i => i.DropboxFileId == img.DropboxFileId);
            if (existing == null)
            {
                img.DropboxVehicleId = dbVehicle.Id;
                img.EmbeddingModel = "gemini-embedding-2";
                img.EmbeddingVersion = "1.0";
                _context.DropboxImages.Add(img);
            }
            else
            {
                if (existing.ContentHash != img.ContentHash)
                {
                    existing.ContentHash = img.ContentHash;
                    existing.Embedding = null;
                    existing.PathDisplay = img.PathDisplay;
                    existing.FileName = img.FileName;
                    existing.UpdatedAt = DateTime.UtcNow;
                }
            }
        }

        foreach (var existing in existingImages)
        {
            if (!cloudImages.Any(i => i.DropboxFileId == existing.DropboxFileId))
            {
                _context.DropboxImages.Remove(existing);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return dbVehicle;
    }

    private async Task<List<DropboxImage>> EnsureDropboxEmbeddingsAsync(DropboxVehicle dbVehicle, CancellationToken cancellationToken)
    {
        var images = await _context.DropboxImages
            .Where(i => i.DropboxVehicleId == dbVehicle.Id)
            .ToListAsync(cancellationToken);

        foreach (var img in images)
        {
            if (img.Embedding != null) continue;

            try
            {
                _logger.LogInformation("Downloading image {FileName} for on-demand embedding generation.", img.FileName);
                var bytes = await _dropboxService.DownloadImageAsync(img.PathDisplay, cancellationToken);
                
                using var ms = new MemoryStream(bytes);
                var embedding = await _embeddingService.GenerateEmbeddingAsync(ms, img.MimeType, cancellationToken);
                
                img.Embedding = embedding;
                img.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate embedding for Dropbox image: {FileId}", img.DropboxFileId);
            }
        }

        return images;
    }

    private sealed class AppEmbeddingResult
    {
        public string Url { get; set; } = string.Empty;
        public float[] Embedding { get; set; } = Array.Empty<float>();
    }

    private async Task<List<AppEmbeddingResult>> EnsureApplicationEmbeddingsAsync(List<string> imageUrls, CancellationToken cancellationToken)
    {
        var list = new List<AppEmbeddingResult>();

        foreach (var url in imageUrls)
        {
            if (string.IsNullOrWhiteSpace(url)) continue;

            try
            {
                var bytes = await DownloadWebImageAsync(url);
                if (bytes == null) continue;

                var hash = CalculateBytesHash(bytes);

                // Check DB cache for this content hash
                var cached = await _context.DropboxImages
                    .FirstOrDefaultAsync(i => i.ContentHash == hash && i.Embedding != null, cancellationToken);

                if (cached != null && cached.Embedding != null)
                {
                    _logger.LogInformation("Hit cache for application image: {Url}", url);
                    list.Add(new AppEmbeddingResult { Url = url, Embedding = cached.Embedding });
                }
                else
                {
                    _logger.LogInformation("Cache miss for application image, generating embedding: {Url}", url);
                    using var ms = new MemoryStream(bytes);
                    var ext = Path.GetExtension(url).ToLowerInvariant();
                    var mimeType = ext == ".png" ? "image/png" : "image/jpeg";

                    var embedding = await _embeddingService.GenerateEmbeddingAsync(ms, mimeType, cancellationToken);

                    // Save generated embedding to DropboxImages table as a cached entry with Null vehicle ID
                    var cacheEntry = new DropboxImage
                    {
                        DropboxVehicleId = null,
                        DropboxFileId = "app_ref_" + Guid.NewGuid().ToString("N"),
                        FileName = Path.GetFileName(url),
                        PathDisplay = url,
                        ContentHash = hash,
                        MimeType = mimeType,
                        Embedding = embedding,
                        EmbeddingModel = "gemini-embedding-2",
                        EmbeddingVersion = "1.0"
                    };
                    _context.DropboxImages.Add(cacheEntry);
                    await _context.SaveChangesAsync(cancellationToken);

                    list.Add(new AppEmbeddingResult { Url = url, Embedding = embedding });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process and embed application image: {Url}", url);
            }
        }

        return list;
    }

    private async Task SaveMatchRequestAsync(VehicleMatchResult result, int? carId, CancellationToken cancellationToken)
    {
        var request = new VehicleMatchRequest
        {
            Id = Guid.Parse(result.RequestId),
            Vin = result.Vin,
            CarId = carId,
            Status = result.Status,
            OverallScore = result.OverallScore,
            Confidence = result.Confidence,
            Decision = result.Decision,
            ErrorMessage = result.ErrorMessage,
            CreatedAt = DateTime.UtcNow
        };
        _context.VehicleMatchRequests.Add(request);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task UpdateRequestStatusAsync(Guid requestId, string status, string? error)
    {
        try
        {
            var record = await _context.VehicleMatchRequests.FindAsync(new object[] { requestId }, CancellationToken.None);
            if (record != null)
            {
                record.Status = status;
                record.ErrorMessage = error;
                record.CompletedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync(CancellationToken.None);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update request status in DB for request {RequestId}", requestId);
        }
    }

    private async Task<byte[]?> DownloadWebImageAsync(string url)
    {
        try
        {
            // If the URL is a local reference URL, check if we can read it directly from the local filesystem!
            if (url.Contains("/images/cars/", StringComparison.OrdinalIgnoreCase))
            {
                var idx = url.IndexOf("/images/cars/", StringComparison.OrdinalIgnoreCase);
                var relativePath = url.Substring(idx).Replace('/', Path.DirectorySeparatorChar);
                var localPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", relativePath.TrimStart(Path.DirectorySeparatorChar));
                
                if (System.IO.File.Exists(localPath))
                {
                    _logger.LogInformation("Found local image on disk for reference, skipping HTTP download: {Path}", localPath);
                    return await System.IO.File.ReadAllBytesAsync(localPath);
                }
            }

            using var client = new HttpClient();
            return await client.GetByteArrayAsync(url);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download reference image from {Url}", url);
            return null;
        }
    }

    private static string CalculateBytesHash(byte[] bytes)
    {
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(bytes);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }
}

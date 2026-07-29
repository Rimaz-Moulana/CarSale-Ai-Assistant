using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using CarSales.Api.Data;
using CarSales.Api.Models;

namespace CarSales.Api.Services;

public class ImageVerificationService
{
    private readonly ApplicationDbContext _context;
    private readonly AiKernelService _aiKernel;
    private readonly HttpClient _dropboxClient;
    private readonly string _dropboxToken;
    private readonly string _baseSyncPath;

    public ImageVerificationService(
        ApplicationDbContext context, 
        AiKernelService aiKernel, 
        IConfiguration configuration,
        IHttpClientFactory httpClientFactory)
    {
        _context = context;
        _aiKernel = aiKernel;
        
        _dropboxToken = configuration["DROPBOX_ACCESS_TOKEN"] ?? string.Empty;
        _dropboxClient = httpClientFactory.CreateClient("Dropbox");

        var configuredPath = configuration["Dropbox:LocalSyncPath"];
        _baseSyncPath = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "DropboxSim")
            : configuredPath;

        if (!Directory.Exists(_baseSyncPath))
        {
            var relativePath = Path.Combine(Directory.GetCurrentDirectory(), "DropboxSim");
            if (Directory.Exists(relativePath))
            {
                _baseSyncPath = relativePath;
            }
        }
    }

    public bool IsCloudEnabled => !string.IsNullOrWhiteSpace(_dropboxToken);

    public async Task<List<CarImageVerification>> GetHistoryAsync()
    {
        return await _context.CarImageVerifications
            .Include(v => v.Car)
            .OrderByDescending(v => v.CheckedAt)
            .ToListAsync();
    }

    public async Task<CarImageVerification> VerifyVehicleAsync(int carId)
    {
        var car = await _context.Cars
            .Include(c => c.Inventory)
            .FirstOrDefaultAsync(c => c.Id == carId);

        if (car == null)
        {
            throw new ArgumentException($"Car with ID {carId} not found.");
        }

        var vin = car.Vin;
        var relativePath = "";
        var status = "Failed";
        var notes = "";
        var mismatchedList = new List<string>();

        if (IsCloudEnabled)
        {
            try
            {
                var folderPath = await SearchCloudFolderByVinAsync(vin);
                if (string.IsNullOrEmpty(folderPath))
                {
                    notes = $"No upload folder found in Dropbox cloud for chassis number: {vin}.";
                }
                else
                {
                    relativePath = folderPath;
                    // Use recursive: true to support All files/VIN/YardName/Date
                    var images = await ListCloudImagesAsync(folderPath, recursive: true);

                    if (!images.Any())
                    {
                        notes = $"Chassis number cloud folder '{folderPath}' found but contains no image files (*.png, *.jpg, *.jpeg).";
                    }
                    else
                    {
                        var auditResult = await RunAiAuditOnImagesAsync(car, images.Select(i => (i.Name, i.Path)).ToList());
                        status = auditResult.Status;
                        notes = auditResult.Notes;
                        mismatchedList = auditResult.MismatchedFiles;
                    }
                }
            }
            catch (Exception ex)
            {
                notes = $"Cloud verification failed: {ex.Message}";
            }
        }
        else
        {
            if (!Directory.Exists(_baseSyncPath))
            {
                notes = $"Dropbox root sync folder not found at: {_baseSyncPath}";
            }
            else
            {
                try
                {
                    var matchingDirs = Directory.GetDirectories(_baseSyncPath, vin, SearchOption.AllDirectories);
                    var targetDir = matchingDirs.FirstOrDefault();

                    if (targetDir == null)
                    {
                        notes = $"No upload folder found in Dropbox for chassis number: {vin}.";
                    }
                    else
                    {
                        relativePath = Path.GetRelativePath(_baseSyncPath, targetDir);
                        var imageExtensions = new[] { "*.png", "*.jpg", "*.jpeg" };
                        // Search recursively in local subfolders as well to support nested dates
                        var images = imageExtensions
                            .SelectMany(ext => Directory.GetFiles(targetDir, ext, SearchOption.AllDirectories))
                            .ToList();

                        if (!images.Any())
                        {
                            notes = $"Chassis number folder '{relativePath}' found but contains no image files (*.png, *.jpg, *.jpeg).";
                        }
                        else
                        {
                            var list = images.Select(p => (Path.GetFileName(p), p)).ToList();
                            var auditResult = await RunAiAuditOnImagesAsync(car, list);
                            status = auditResult.Status;
                            notes = auditResult.Notes;
                            mismatchedList = auditResult.MismatchedFiles;
                        }
                    }
                }
                catch (Exception ex)
                {
                    notes = $"Verification process failed: {ex.Message}";
                }
            }
        }

        var verification = new CarImageVerification
        {
            CarId = carId,
            ChassisNumber = vin,
            Status = status,
            DropboxPath = relativePath,
            ResultNotes = notes,
            MismatchedFiles = mismatchedList.Any() ? string.Join(",", mismatchedList) : null,
            CheckedAt = DateTime.UtcNow
        };

        _context.CarImageVerifications.Add(verification);
        await _context.SaveChangesAsync();

        return verification;
    }

    public async Task<CarImageVerification> VerifyFolderAsync(string folderPath, int? carId)
    {
        Car? car = null;

        if (carId.HasValue)
        {
            car = await _context.Cars.Include(c => c.Inventory).FirstOrDefaultAsync(c => c.Id == carId.Value);
        }
        else
        {
            // Auto-detect VIN from path
            var allCars = await _context.Cars.Include(c => c.Inventory).ToListAsync();
            car = allCars.FirstOrDefault(c => folderPath.Contains(c.Vin, StringComparison.OrdinalIgnoreCase));
        }

        if (car == null)
        {
            throw new ArgumentException("Could not identify the registered car for this folder path. Please select the car manually.");
        }

        var status = "Failed";
        var notes = "";
        var mismatchedList = new List<string>();

        if (IsCloudEnabled)
        {
            // Read from Dropbox path directly
            var images = await ListCloudImagesAsync(folderPath, recursive: true);
            if (!images.Any())
            {
                notes = $"Folder '{folderPath}' contains no image files (*.png, *.jpg, *.jpeg).";
            }
            else
            {
                var auditResult = await RunAiAuditOnImagesAsync(car, images.Select(i => (i.Name, i.Path)).ToList());
                status = auditResult.Status;
                notes = auditResult.Notes;
                mismatchedList = auditResult.MismatchedFiles;
            }
        }
        else
        {
            // Local path mode
            var localPath = Path.Combine(_baseSyncPath, folderPath.Replace("/", "\\"));
            if (Directory.Exists(localPath))
            {
                var imageExtensions = new[] { "*.png", "*.jpg", "*.jpeg" };
                var images = imageExtensions
                    .SelectMany(ext => Directory.GetFiles(localPath, ext, SearchOption.AllDirectories))
                    .ToList();

                if (!images.Any())
                {
                    notes = $"Folder '{folderPath}' contains no image files.";
                }
                else
                {
                    var list = images.Select(p => (Path.GetFileName(p), p)).ToList();
                    var auditResult = await RunAiAuditOnImagesAsync(car, list);
                    status = auditResult.Status;
                    notes = auditResult.Notes;
                    mismatchedList = auditResult.MismatchedFiles;
                }
            }
            else
            {
                notes = $"Local folder not found at: {localPath}";
            }
        }

        var verification = new CarImageVerification
        {
            CarId = car.Id,
            ChassisNumber = car.Vin,
            Status = status,
            DropboxPath = folderPath,
            ResultNotes = $"[Manual Folder Selection Run]\n{notes}",
            MismatchedFiles = mismatchedList.Any() ? string.Join(",", mismatchedList) : null,
            CheckedAt = DateTime.UtcNow
        };

        _context.CarImageVerifications.Add(verification);
        await _context.SaveChangesAsync();

        return verification;
    }

    public async Task<List<CarImageVerification>> VerifyAllSyncFoldersAsync()
    {
        var results = new List<CarImageVerification>();
        var allCars = await _context.Cars.Select(c => new { c.Id, c.Vin }).ToListAsync();

        if (IsCloudEnabled)
        {
            foreach (var car in allCars)
            {
                try
                {
                    var folderPath = await SearchCloudFolderByVinAsync(car.Vin);
                    if (!string.IsNullOrEmpty(folderPath))
                    {
                        var result = await VerifyVehicleAsync(car.Id);
                        results.Add(result);
                    }
                }
                catch
                {
                    // Ignore transient errors
                }
            }
        }
        else
        {
            if (!Directory.Exists(_baseSyncPath))
            {
                return results;
            }

            foreach (var car in allCars)
            {
                var matchingDirs = Directory.GetDirectories(_baseSyncPath, car.Vin, SearchOption.AllDirectories);
                if (matchingDirs.Any())
                {
                    var result = await VerifyVehicleAsync(car.Id);
                    results.Add(result);
                }
            }
        }

        return results;
    }

    public async Task<CarImageVerification?> OverrideStatusAsync(int verificationId, string status, string notes)
    {
        var verification = await _context.CarImageVerifications
            .Include(v => v.Car)
            .FirstOrDefaultAsync(v => v.Id == verificationId);

        if (verification == null)
        {
            return null;
        }

        verification.Status = status;
        verification.ResultNotes = string.IsNullOrWhiteSpace(notes)
            ? $"{verification.ResultNotes}\n[Manual Override to {status} at {DateTime.UtcNow}]"
            : $"{verification.ResultNotes}\n[Manual Override to {status}]: {notes}";
        
        await _context.SaveChangesAsync();
        return verification;
    }

    public async Task<List<DropboxFolderDto>> ListFoldersAsync(string path)
    {
        var list = new List<DropboxFolderDto>();

        if (IsCloudEnabled)
        {
            var request = CreateDropboxRequest(HttpMethod.Post, "https://api.dropboxapi.com/2/files/list_folder");
            request.Content = JsonContent.Create(new { path = path });

            using var response = await _dropboxClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errContent = await response.Content.ReadAsStringAsync();
                throw new InvalidOperationException($"Dropbox API returned {response.StatusCode} (Unauthorized/Expired Token). Details: {errContent}");
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>();
            if (json.TryGetProperty("entries", out var entries) && entries.ValueKind == JsonValueKind.Array)
            {
                foreach (var entry in entries.EnumerateArray())
                {
                    if (entry.TryGetProperty(".tag", out var tag) && tag.GetString() == "folder")
                    {
                        list.Add(new DropboxFolderDto
                        {
                            Name = entry.GetProperty("name").GetString() ?? "",
                            Path = entry.GetProperty("path_display").GetString() ?? ""
                        });
                    }
                }
            }
        }
        else
        {
            if (!Directory.Exists(_baseSyncPath))
            {
                return list;
            }

            var localRoot = string.IsNullOrEmpty(path) ? _baseSyncPath : Path.Combine(_baseSyncPath, path.Replace("/", "\\"));
            if (Directory.Exists(localRoot))
            {
                var dirs = Directory.GetDirectories(localRoot);
                foreach (var dir in dirs)
                {
                    var relative = Path.GetRelativePath(_baseSyncPath, dir).Replace("\\", "/");
                    list.Add(new DropboxFolderDto
                    {
                        Name = Path.GetFileName(dir),
                        Path = relative.StartsWith("/") ? relative : "/" + relative
                    });
                }
            }
        }

        return list;
    }

    public async Task<List<string>> GetDropboxImageFilesAsync(string chassisNumber)
    {
        var list = new List<string>();

        if (IsCloudEnabled)
        {
            try
            {
                var folderPath = await SearchCloudFolderByVinAsync(chassisNumber);
                if (!string.IsNullOrEmpty(folderPath))
                {
                    var images = await ListCloudImagesAsync(folderPath, recursive: true);
                    list = images.Select(img => img.Name).ToList();
                }
            }
            catch
            {
                // return empty list
            }
        }
        else
        {
            if (!Directory.Exists(_baseSyncPath))
            {
                return list;
            }

            var matchingDirs = Directory.GetDirectories(_baseSyncPath, chassisNumber, SearchOption.AllDirectories);
            var targetDir = matchingDirs.FirstOrDefault();
            if (targetDir != null)
            {
                var imageExtensions = new[] { "*.png", "*.jpg", "*.jpeg" };
                list = imageExtensions
                    .SelectMany(ext => Directory.GetFiles(targetDir, ext, SearchOption.AllDirectories))
                    .Select(p => Path.GetFileName(p))
                    .ToList();
            }
        }

        return list;
    }

    public async Task<byte[]?> GetDropboxImageContentAsync(string chassisNumber, string fileName)
    {
        if (IsCloudEnabled)
        {
            try
            {
                var folderPath = await SearchCloudFolderByVinAsync(chassisNumber);
                if (!string.IsNullOrEmpty(folderPath))
                {
                    // Find matching file path in cloud list
                    var images = await ListCloudImagesAsync(folderPath, recursive: true);
                    var match = images.FirstOrDefault(i => string.Equals(i.Name, fileName, StringComparison.OrdinalIgnoreCase));
                    if (match != null)
                    {
                        return await DownloadCloudFileAsync(match.Path);
                    }

                    // Fallback to relative assembly
                    var fallbackPath = (folderPath + "/" + fileName).Replace("//", "/");
                    if (!fallbackPath.StartsWith("/"))
                    {
                        fallbackPath = "/" + fallbackPath;
                    }
                    return await DownloadCloudFileAsync(fallbackPath);
                }
            }
            catch
            {
                return null;
            }
        }
        else
        {
            if (!Directory.Exists(_baseSyncPath))
            {
                return null;
            }

            var matchingDirs = Directory.GetDirectories(_baseSyncPath, chassisNumber, SearchOption.AllDirectories);
            var targetDir = matchingDirs.FirstOrDefault();
            if (targetDir != null)
            {
                var files = Directory.GetFiles(targetDir, fileName, SearchOption.AllDirectories);
                var match = files.FirstOrDefault();
                if (match != null && File.Exists(match))
                {
                    return await File.ReadAllBytesAsync(match);
                }
            }
        }

        return null;
    }

    // --- UTILITIES ---

    private sealed class AuditResult
    {
        public string Status { get; set; } = "Failed";
        public string Notes { get; set; } = string.Empty;
        public List<string> MismatchedFiles { get; set; } = new();
    }

    private async Task<AuditResult> RunAiAuditOnImagesAsync(Car car, List<(string Name, string Path)> images)
    {
        var allPassed = true;
        var auditReasons = new List<string>();
        var mismatchedList = new List<string>();

        // 1. Download database reference images
        var referenceImages = new List<(byte[] Bytes, string MimeType)>();
        var dbImageUrls = car.Images ?? new List<string>();
        
        foreach (var url in dbImageUrls)
        {
            if (string.IsNullOrWhiteSpace(url)) continue;
            var dbImgBytes = await DownloadWebImageAsync(url);
            if (dbImgBytes != null)
            {
                var ext = Path.GetExtension(url).ToLowerInvariant();
                var refMime = ext == ".png" ? "image/png" : "image/jpeg";
                referenceImages.Add((dbImgBytes, refMime));
            }
        }

        var isFirst = true;
        foreach (var img in images)
        {
            if (!isFirst && string.Equals(_aiKernel.GetProvider(), "Gemini", StringComparison.OrdinalIgnoreCase))
            {
                await Task.Delay(1000); // 1 second delay between image audits to respect Gemini API rate limits
            }
            isFirst = false;

            var fileName = img.Name;
            byte[] bytes;

            try
            {
                if (IsCloudEnabled)
                {
                    bytes = await DownloadCloudFileAsync(img.Path);
                }
                else
                {
                    bytes = await File.ReadAllBytesAsync(img.Path);
                }
            }
            catch (Exception ex)
            {
                auditReasons.Add($"[Error reading {fileName}: {ex.Message}]");
                allPassed = false;
                mismatchedList.Add(fileName);
                continue;
            }

            string response;
            bool isMatch;

            if (referenceImages.Any())
            {
                // Multi-Image comparison prompt
                var prompt = $@"You are an automated vehicle verification auditor.
Compare the uploaded Dropbox vehicle image (the first image) with the database reference images of the vehicle (the subsequent images).

Expected Specifications:
Brand/Make: {car.Brand}
Model: {car.Model}
Color: {car.Color}
Year: {car.Year}

Perform a dual verification check:
1. **Metadata match**: Verify if the car in the Dropbox photo matches the specifications (Make, Model, Color, Year) listed.
2. **Visual similarity match**: Compare the Dropbox photo against the database reference photos. Verify if they depict the same vehicle. Pay attention to damage, custom parts, body profile, and colors to ensure there is no match conflict.

Format your response strictly as follows:
STATUS: [MATCH | MISMATCH]
REASON: [Explain whether they match, and describe in detail any styling, custom parts, or color discrepancies between the Dropbox image and the database reference images/specifications]
";
                response = await _aiKernel.RunVisionMultiImageAsync(prompt, bytes, GetMimeType(fileName), referenceImages);
            }
            else
            {
                // Standard prompt
                var prompt = $@"You are an automated vehicle verification auditor.
Compare the vehicle image with the following official database specifications:
Brand/Make: {car.Brand}
Model: {car.Model}
Color: {car.Color}
Year: {car.Year}

Check carefully for:
1. Is the car in the image of the correct brand/make?
2. Is the car in the image of the correct color?
3. Does the vehicle body type match the model?

Format your response strictly as follows:
STATUS: [MATCH | MISMATCH]
REASON: [Explain why they match, or provide a detailed description of the mismatch/conflict]
";
                response = await _aiKernel.RunVisionAsync(prompt, bytes, GetMimeType(fileName));
            }

            isMatch = ParseAiStatus(response);

            if (!isMatch)
            {
                allPassed = false;
                mismatchedList.Add(fileName);
                auditReasons.Add($"[{fileName} MISMATCH: {ExtractReason(response)}]");
            }
            else
            {
                auditReasons.Add($"[{fileName} MATCH: {ExtractReason(response)}]");
            }
        }

        return new AuditResult
        {
            Status = allPassed ? "Passed" : "Failed",
            Notes = string.Join("\n", auditReasons),
            MismatchedFiles = mismatchedList
        };
    }

    private async Task<byte[]?> DownloadWebImageAsync(string url)
    {
        try
        {
            using var client = new HttpClient();
            return await client.GetByteArrayAsync(url);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to download reference image from {url}: {ex.Message}");
            return null;
        }
    }

    private HttpRequestMessage CreateDropboxRequest(HttpMethod method, string url)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _dropboxToken);
        return request;
    }

    private async Task<string?> SearchCloudFolderByVinAsync(string vin)
    {
        var request = CreateDropboxRequest(HttpMethod.Post, "https://api.dropboxapi.com/2/files/search_v2");
        var searchParams = new
        {
            query = vin,
            options = new
            {
                file_categories = new[] { "folder" }
            }
        };
        request.Content = JsonContent.Create(searchParams);

        using var response = await _dropboxClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Dropbox API Search failed ({response.StatusCode}). Details: {err}");
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        if (json.TryGetProperty("matches", out var matches) && matches.ValueKind == JsonValueKind.Array)
        {
            foreach (var match in matches.EnumerateArray())
            {
                if (match.TryGetProperty("metadata", out var meta) && meta.TryGetProperty("metadata", out var innerMeta))
                {
                    if (innerMeta.TryGetProperty(".tag", out var tag) && tag.GetString() == "folder")
                    {
                        var name = innerMeta.GetProperty("name").GetString() ?? "";
                        if (string.Equals(name, vin, StringComparison.OrdinalIgnoreCase))
                        {
                            return innerMeta.GetProperty("path_lower").GetString();
                        }
                    }
                }
            }
        }

        return null;
    }

    private sealed class CloudImageInfo
    {
        public string Name { get; set; } = string.Empty;
        public string Path { get; set; } = string.Empty;
    }

    private async Task<List<CloudImageInfo>> ListCloudImagesAsync(string folderPath, bool recursive = false)
    {
        var list = new List<CloudImageInfo>();
        var request = CreateDropboxRequest(HttpMethod.Post, "https://api.dropboxapi.com/2/files/list_folder");
        request.Content = JsonContent.Create(new { path = folderPath, recursive = recursive });

        using var response = await _dropboxClient.SendAsync(request);
        if (!response.IsSuccessStatusCode)
        {
            var err = await response.Content.ReadAsStringAsync();
            throw new InvalidOperationException($"Dropbox API List Folder failed ({response.StatusCode}). Details: {err}");
        }

        var json = await response.Content.ReadFromJsonAsync<JsonElement>();
        await ParseEntriesAsync(json, list);

        // Handle pagination cursor if folder content is large
        while (json.TryGetProperty("has_more", out var hasMore) && hasMore.GetBoolean() && json.TryGetProperty("cursor", out var cursor))
        {
            var nextRequest = CreateDropboxRequest(HttpMethod.Post, "https://api.dropboxapi.com/2/files/list_folder/continue");
            nextRequest.Content = JsonContent.Create(new { cursor = cursor.GetString() });

            using var nextResponse = await _dropboxClient.SendAsync(nextRequest);
            if (!nextResponse.IsSuccessStatusCode)
            {
                break;
            }

            json = await nextResponse.Content.ReadFromJsonAsync<JsonElement>();
            await ParseEntriesAsync(json, list);
        }

        return list;
    }

    private async Task ParseEntriesAsync(JsonElement json, List<CloudImageInfo> list)
    {
        if (json.TryGetProperty("entries", out var entries) && entries.ValueKind == JsonValueKind.Array)
        {
            foreach (var entry in entries.EnumerateArray())
            {
                if (entry.TryGetProperty(".tag", out var tag) && tag.GetString() == "file")
                {
                    var name = entry.GetProperty("name").GetString() ?? "";
                    var ext = Path.GetExtension(name).ToLowerInvariant();
                    if (ext == ".png" || ext == ".jpg" || ext == ".jpeg")
                    {
                        list.Add(new CloudImageInfo
                        {
                            Name = name,
                            Path = entry.GetProperty("path_lower").GetString() ?? ""
                        });
                    }
                }
            }
        }
        await Task.CompletedTask;
    }

    private async Task<byte[]> DownloadCloudFileAsync(string filePath)
    {
        var request = CreateDropboxRequest(HttpMethod.Post, "https://content.dropboxapi.com/2/files/download");
        request.Headers.Add("Dropbox-API-Arg", JsonSerializer.Serialize(new { path = filePath }));

        using var response = await _dropboxClient.SendAsync(request);
        response.EnsureSuccessStatusCode();

        return await response.Content.ReadAsByteArrayAsync();
    }

    private static string GetMimeType(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
    }

    private static bool ParseAiStatus(string response)
    {
        if (response.Contains("STATUS: MATCH"))
        {
            return true;
        }
        if (response.Contains("STATUS: MISMATCH"))
        {
            return false;
        }
        var hasMismatch = response.Contains("mismatch", StringComparison.OrdinalIgnoreCase) || response.Contains("failed", StringComparison.OrdinalIgnoreCase);
        return !hasMismatch;
    }

    private static string ExtractReason(string response)
    {
        var index = response.IndexOf("REASON:", StringComparison.OrdinalIgnoreCase);
        if (index >= 0)
        {
            return response.Substring(index + 7).Trim();
        }
        return response.Trim();
    }
}

public class DropboxFolderDto
{
    public string Name { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
}

using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using CarSales.Api.Data;
using CarSales.Api.Models;

namespace CarSales.Api.Services;

public class DropboxSyncWorker : BackgroundService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<DropboxSyncWorker> _logger;
    private readonly TimeSpan _syncInterval = TimeSpan.FromHours(1);

    public DropboxSyncWorker(IServiceScopeFactory scopeFactory, ILogger<DropboxSyncWorker> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("DropboxSyncWorker started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SyncAllVehiclesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred during Dropbox synchronization.");
            }

            try
            {
                await Task.Delay(_syncInterval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("DropboxSyncWorker stopped.");
    }

    public async Task SyncAllVehiclesAsync(CancellationToken cancellationToken)
    {
        using var scope = _scopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var dropboxService = scope.ServiceProvider.GetRequiredService<IDropboxService>();
        var embeddingService = scope.ServiceProvider.GetRequiredService<IImageEmbeddingService>();

        _logger.LogInformation("Starting Dropbox vehicle metadata synchronization.");

        var cars = await context.Cars.Select(c => new { c.Id, c.Vin }).ToListAsync(cancellationToken);

        foreach (var car in cars)
        {
            if (cancellationToken.IsCancellationRequested) break;

            var normalizedVin = car.Vin.Trim().ToUpperInvariant();
            if (string.IsNullOrWhiteSpace(normalizedVin)) continue;

            try
            {
                var folderPath = await dropboxService.FindVinFolderAsync(normalizedVin, cancellationToken);
                if (string.IsNullOrEmpty(folderPath))
                {
                    _logger.LogDebug("No Dropbox folder found for VIN: {Vin}", normalizedVin);
                    continue;
                }

                // Retrieve or create DropboxVehicle
                var dbVehicle = await context.DropboxVehicles
                    .Include(v => v.Images)
                    .FirstOrDefaultAsync(v => v.Vin == normalizedVin, cancellationToken);

                var folderParts = folderPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
                var dealer = folderParts.Length > 1 ? folderParts[1] : "Unknown Dealer";
                var dateFolder = folderParts.Length > 2 ? folderParts[2] : "Default";

                if (dbVehicle == null)
                {
                    dbVehicle = new DropboxVehicle
                    {
                        Vin = normalizedVin,
                        Dealer = dealer,
                        FolderPath = folderPath,
                        DateFolder = dateFolder,
                        LastSyncedAt = DateTime.UtcNow
                    };
                    context.DropboxVehicles.Add(dbVehicle);
                }
                else
                {
                    dbVehicle.FolderPath = folderPath;
                    dbVehicle.Dealer = dealer;
                    dbVehicle.DateFolder = dateFolder;
                    dbVehicle.LastSyncedAt = DateTime.UtcNow;
                }

                await context.SaveChangesAsync(cancellationToken);

                // Fetch current images from Dropbox
                var cloudImages = await dropboxService.GetVehicleImagesAsync(folderPath, cancellationToken);
                var existingImages = dbVehicle.Images.ToList();

                foreach (var img in cloudImages)
                {
                    var existing = existingImages.FirstOrDefault(i => i.DropboxFileId == img.DropboxFileId);
                    if (existing == null)
                    {
                        img.DropboxVehicleId = dbVehicle.Id;
                        img.EmbeddingModel = "gemini-embedding-2";
                        img.EmbeddingVersion = "1.0";
                        context.DropboxImages.Add(img);
                    }
                    else
                    {
                        if (existing.ContentHash != img.ContentHash)
                        {
                            existing.ContentHash = img.ContentHash;
                            existing.Embedding = null; // Mark for regeneration
                            existing.PathDisplay = img.PathDisplay;
                            existing.FileName = img.FileName;
                            existing.UpdatedAt = DateTime.UtcNow;
                        }
                    }
                }

                // Remove images that no longer exist in Dropbox
                foreach (var existing in existingImages)
                {
                    if (!cloudImages.Any(i => i.DropboxFileId == existing.DropboxFileId))
                    {
                        context.DropboxImages.Remove(existing);
                    }
                }

                await context.SaveChangesAsync(cancellationToken);

                // Proactively generate embeddings for new/updated images
                var pendingEmbeddings = await context.DropboxImages
                    .Where(i => i.DropboxVehicleId == dbVehicle.Id && i.Embedding == null)
                    .ToListAsync(cancellationToken);

                foreach (var pending in pendingEmbeddings)
                {
                    try
                    {
                        _logger.LogInformation("Generating embedding for image: {FileName} in VIN {Vin}", pending.FileName, normalizedVin);
                        var imageBytes = await dropboxService.DownloadImageAsync(pending.PathDisplay, cancellationToken);
                        
                        using var ms = new MemoryStream(imageBytes);
                        var embedding = await embeddingService.GenerateEmbeddingAsync(ms, pending.MimeType, cancellationToken);
                        
                        pending.Embedding = embedding;
                        pending.UpdatedAt = DateTime.UtcNow;
                        
                        await context.SaveChangesAsync(cancellationToken);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to generate embedding for Dropbox image: {FileId}", pending.DropboxFileId);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to sync vehicle folder for VIN: {Vin}", normalizedVin);
            }
        }

        _logger.LogInformation("Dropbox vehicle metadata synchronization complete.");
    }
}

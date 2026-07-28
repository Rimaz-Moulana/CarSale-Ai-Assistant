using System;

namespace CarSales.Api.Models;

public class DropboxImage
{
    public int Id { get; set; }
    public int? DropboxVehicleId { get; set; }
    public DropboxVehicle? DropboxVehicle { get; set; }
    public string DropboxFileId { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string PathDisplay { get; set; } = string.Empty;
    public string ContentHash { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public string ImageType { get; set; } = "OTHER";
    public float[]? Embedding { get; set; }
    public string EmbeddingModel { get; set; } = string.Empty;
    public string EmbeddingVersion { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

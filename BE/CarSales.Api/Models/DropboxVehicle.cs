using System;
using System.Collections.Generic;

namespace CarSales.Api.Models;

public class DropboxVehicle
{
    public int Id { get; set; }
    public string Vin { get; set; } = string.Empty;
    public string Dealer { get; set; } = string.Empty;
    public string FolderPath { get; set; } = string.Empty;
    public string DateFolder { get; set; } = string.Empty;
    public DateTime LastSyncedAt { get; set; } = DateTime.UtcNow;

    public ICollection<DropboxImage> Images { get; set; } = new List<DropboxImage>();
}

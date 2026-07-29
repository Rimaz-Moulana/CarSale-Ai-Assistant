using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace CarSales.Api.Services;

public class ImageMatchDetail
{
    public string ApplicationImage { get; set; } = string.Empty;
    public string DropboxImageName { get; set; } = string.Empty;
    public string DropboxImagePath { get; set; } = string.Empty;
    public double Similarity { get; set; }
    public string Decision { get; set; } = string.Empty; // MATCH, REVIEW, NO_MATCH
    public string? Explanation { get; set; }
}

public class VehicleMatchResult
{
    public string RequestId { get; set; } = string.Empty;
    public string Vin { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty; // PENDING, PROCESSING, COMPLETED, FAILED
    public double OverallScore { get; set; }
    public string Confidence { get; set; } = string.Empty; // HIGH, MEDIUM, LOW
    public string Decision { get; set; } = string.Empty; // MATCH, REVIEW, NO_MATCH
    public int ApplicationImageCount { get; set; }
    public int DropboxImageCount { get; set; }
    public int MatchedImageCount { get; set; }
    public int ReviewRequiredCount { get; set; }
    public string? ErrorMessage { get; set; }
    public List<ImageMatchDetail> Matches { get; set; } = new();
}

public interface IVehicleImageMatchingService
{
    Task<VehicleMatchResult> MatchVehicleAsync(string vin, CancellationToken cancellationToken);
}

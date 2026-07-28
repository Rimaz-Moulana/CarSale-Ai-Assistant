using System;

namespace CarSales.Api.Models;

public class VehicleImageMatch
{
    public int Id { get; set; }
    public Guid MatchRequestId { get; set; }
    public VehicleMatchRequest? MatchRequest { get; set; }
    public string VehicleImageId { get; set; } = string.Empty; // URL of the DB reference image
    public int DropboxImageId { get; set; }
    public DropboxImage? DropboxImage { get; set; }
    public double SimilarityScore { get; set; }
    public string Decision { get; set; } = "REVIEW"; // MATCH, REVIEW, NO_MATCH
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

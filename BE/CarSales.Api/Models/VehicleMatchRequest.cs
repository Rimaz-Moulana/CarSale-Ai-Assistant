using System;
using System.Collections.Generic;

namespace CarSales.Api.Models;

public class VehicleMatchRequest
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Vin { get; set; } = string.Empty;
    public int? CarId { get; set; }
    public Car? Car { get; set; }
    public string? UserId { get; set; }
    public string Status { get; set; } = "PENDING"; // PENDING, PROCESSING, COMPLETED, FAILED
    public double OverallScore { get; set; }
    public string Confidence { get; set; } = "LOW"; // HIGH, MEDIUM, LOW
    public string Decision { get; set; } = "REVIEW"; // MATCH, REVIEW, NO_MATCH
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }

    public ICollection<VehicleImageMatch> ImageMatches { get; set; } = new List<VehicleImageMatch>();
}

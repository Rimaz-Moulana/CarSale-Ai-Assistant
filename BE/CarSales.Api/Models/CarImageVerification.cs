using System;

namespace CarSales.Api.Models;

public class CarImageVerification
{
    public int Id { get; set; }
    public int CarId { get; set; }
    public Car? Car { get; set; }
    public string ChassisNumber { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending Review"; // Passed, Failed, Pending Review
    public string DropboxPath { get; set; } = string.Empty;
    public string ResultNotes { get; set; } = string.Empty;
    public string? MismatchedFiles { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
}

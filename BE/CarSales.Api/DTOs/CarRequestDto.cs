namespace CarSales.Api.DTOs;

public class CarRequestDto
{
    public string Vin { get; set; } = string.Empty;
    public string Make { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public decimal Price { get; set; }
    public string Status { get; set; } = "Available";
    public int Quantity { get; set; } = 1;
    public string ImageUrl { get; set; } = string.Empty;
    public string Color { get; set; } = string.Empty;
    public System.Collections.Generic.List<string> Images { get; set; } = new();
}

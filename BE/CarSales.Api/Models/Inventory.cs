namespace CarSales.Api.Models;

public class Inventory
{
    public int Id { get; set; }
    public int CarId { get; set; }
    public Car? Car { get; set; }
    public int Quantity { get; set; } = 1;
    public string Location { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

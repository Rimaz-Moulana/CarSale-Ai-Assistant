namespace CarSales.Api.Models;

public class Car
{
    public int Id { get; set; }
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string Color { get; set; } = string.Empty;
    public string Vin { get; set; } = string.Empty;
    public decimal PurchasePrice { get; set; }
    public decimal SellingPrice { get; set; }
    public bool IsAvailable { get; set; } = true;
    public int? SupplierId { get; set; }
    public Supplier? Supplier { get; set; }
    public Inventory? Inventory { get; set; }
    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
    public List<string> Images { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

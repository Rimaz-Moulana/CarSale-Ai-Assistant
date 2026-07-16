namespace CarSales.Api.Models;

public class Sale
{
    public int Id { get; set; }
    public int CarId { get; set; }
    public Car? Car { get; set; }
    public int CustomerId { get; set; }
    public Customer? Customer { get; set; }
    public int UserId { get; set; }
    public User? User { get; set; }
    public DateTime SaleDate { get; set; } = DateTime.UtcNow;
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "Completed";
    public string Notes { get; set; } = string.Empty;
    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}

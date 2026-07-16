namespace CarSales.Api.Models;

public class Customer
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;
    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

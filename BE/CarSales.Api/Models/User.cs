namespace CarSales.Api.Models;

public class User
{
    public int Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "Staff";
    public ICollection<Sale> Sales { get; set; } = new List<Sale>();
    public ICollection<PurchaseOrder> PurchaseOrders { get; set; } = new List<PurchaseOrder>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

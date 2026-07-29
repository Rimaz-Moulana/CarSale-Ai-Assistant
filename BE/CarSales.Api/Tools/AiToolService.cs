using System.Text;
using System.Threading.Tasks;
using System.ComponentModel;
using CarSales.Api.Services;

namespace CarSales.Api.Tools;

public sealed class AiToolService
{
    private readonly FinanceService _finance;
    private readonly SalesService _sales;
    private readonly InventoryService _inventory;
    private readonly ProcurementService _procurement;
    private readonly CarsService _cars;
    private readonly CustomersService _customers;
    private readonly IVehicleImageMatchingService _matchingService;

    public AiToolService(
        FinanceService finance,
        SalesService sales,
        InventoryService inventory,
        ProcurementService procurement,
        CarsService cars,
        CustomersService customers,
        IVehicleImageMatchingService matchingService)
    {
        _finance = finance;
        _sales = sales;
        _inventory = inventory;
        _procurement = procurement;
        _cars = cars;
        _customers = customers;
        _matchingService = matchingService;
    }

    [Description("Retrieves a summary of financial metrics including revenue, expenses, profit, cash flow, outstanding payments, and inventory value.")]
    public async Task<string> GetFinanceSummaryAsync()
    {
        var metrics = await _finance.GetFinanceMetricsAsync();
        return $@"
Finance summary:
- Revenue: {metrics.Revenue:C}
- Expenses: {metrics.Expenses:C}
- Profit: {metrics.Profit:C}
- Cash flow: {metrics.CashFlow:C}
- Outstanding payments: {metrics.OutstandingPayments:C}
- Inventory value: {metrics.InventoryValue:C}";
    }

    [Description("Retrieves a summary of sales metrics including today's sales, monthly sales, total revenue, estimated profit, and outstanding payments.")]
    public async Task<string> GetSalesSummaryAsync()
    {
        var metrics = await _sales.GetSalesMetricsAsync();
        return $@"
Sales summary:
- Today sales: {metrics.TodaysSales}
- Monthly sales: {metrics.MonthlySales}
- Revenue: {metrics.Revenue:C}
- Profit estimate: {metrics.Profit:C}
- Outstanding payments: {metrics.OutstandingPayments:C}";
    }

    [Description("Retrieves a summary of inventory metrics including total vehicles, available stock, low stock items, and total inventory value.")]
    public async Task<string> GetInventorySummaryAsync()
    {
        var metrics = await _inventory.GetInventoryMetricsAsync();
        return $@"
Inventory summary:
- Total vehicles: {metrics.TotalVehicles}
- Available stock: {metrics.AvailableStock}
- Low stock items: {metrics.LowStock}
- Sold items: {metrics.Sold}
- Inventory value: {metrics.InventoryValue:C}";
    }

    [Description("Retrieves a summary of procurement metrics including active orders, pending deliveries, and total spend in the last 30 days.")]
    public async Task<string> GetProcurementSummaryAsync()
    {
        var metrics = await _procurement.GetProcurementMetricsAsync();
        return $@"
Procurement summary:
- Active orders: {metrics.ActiveOrders}
- Pending deliveries: {metrics.PendingDeliveries}
- Spend last 30 days: {metrics.TotalSpend:C}
- Delivered this month: {metrics.DeliveredThisMonth}";
    }

    [Description("Searches the car inventory based on a text query. Returns matching car models, prices, and quantities.")]
    public async Task<string> SearchCarsAsync([Description("The search query, e.g., car make, model, or year.")] string query)
    {
        var results = await _cars.GetCarsAsync(1, 10, query, "All");
        var sb = new StringBuilder("Car search results:\n");
        foreach (var item in results.Data)
        {
            sb.AppendLine($"- {item.Make} {item.Model} ({item.Year}), price {item.Price:C}, status {item.Status}, qty {item.Quantity}");
        }

        return sb.ToString();
    }

    [Description("Searches the customer database based on a text query. Returns matching customer names, total spent, and vehicles purchased.")]
    public async Task<string> SearchCustomersAsync([Description("The search query, e.g., customer name or contact info.")] string query)
    {
        var results = await _customers.GetCustomersAsync(1, 10, query);
        var sb = new StringBuilder("Customer search results:\n");
        foreach (var item in results.Data)
        {
            sb.AppendLine($"- {item.Name}, spent {item.TotalSpent:C}, purchases {item.VehiclesPurchased}");
        }

        return sb.ToString();
    }

    [Description("Runs an automated image similarity audit comparing database reference images against Dropbox images for a given VIN.")]
    public async Task<string> RunVehicleImageMatchAsync([Description("The 17-character VIN of the vehicle to match.")] string vin)
    {
        try
        {
            var result = await _matchingService.MatchVehicleAsync(vin, CancellationToken.None);
            if (result.Status == "FAILED")
            {
                return $"Vehicle image audit failed: {result.ErrorMessage}";
            }

            var sb = new StringBuilder();
            sb.AppendLine($"Image Match Audit completed for VIN: {result.Vin}");
            sb.AppendLine($"- Overall Similarity: {result.OverallScore:P1}");
            sb.AppendLine($"- Confidence: {result.Confidence}");
            sb.AppendLine($"- Match Decision: {result.Decision}");
            sb.AppendLine($"- Application Images: {result.ApplicationImageCount}");
            sb.AppendLine($"- Dropbox Images: {result.DropboxImageCount}");
            sb.AppendLine($"- High-Confidence Matches: {result.MatchedImageCount}");
            sb.AppendLine($"- Review Required: {result.ReviewRequiredCount}");
            sb.AppendLine();
            sb.AppendLine("Matches Detail:");
            foreach (var match in result.Matches)
            {
                sb.AppendLine($"- Ref: {Path.GetFileName(match.ApplicationImage)} matches {match.DropboxImageName} with similarity {match.Similarity:P1} (Decision: {match.Decision})");
                if (!string.IsNullOrEmpty(match.Explanation))
                {
                    sb.AppendLine($"  Explanation: {match.Explanation}");
                }
            }

            return sb.ToString();
        }
        catch (Exception ex)
        {
            return $"Error performing image matching audit: {ex.Message}";
        }
    }
}
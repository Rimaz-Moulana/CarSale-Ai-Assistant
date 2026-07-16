using CarSales.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace CarSales.Api.Services;

public sealed class FinanceService
{
    private readonly ApplicationDbContext _context;

    public FinanceService(ApplicationDbContext context)
    {
        _context = context;
    }

    public sealed record FinanceMetricsDto(
        decimal Revenue,
        decimal Expenses,
        decimal Profit,
        decimal CashFlow,
        decimal OutstandingPayments,
        decimal InventoryValue);

    public sealed record FinanceChartPoint(string Name, decimal Profit);
    public sealed record FinanceChartSeriesPoint(string Name, decimal InAmount, decimal OutAmount);
    public sealed record ExpenseBreakdownItem(string Name, decimal Value, string Color);

    public sealed record FinanceDashboardDto(
        FinanceMetricsDto Kpis,
        IReadOnlyList<FinanceChartPoint> SalesTrend,
        IReadOnlyList<RevenueExpensesPoint> RevenueVsExpenses,
        IReadOnlyList<VehicleCategoryItem> VehicleCategories);

    public sealed record RevenueExpensesPoint(string Name, decimal Revenue, decimal Expenses);
    public sealed record VehicleCategoryItem(string Name, int Value, string Color);

    public sealed record TransactionItem(string Id, string Date, string Description, string Type, decimal Amount, string Status);

    public async Task<FinanceMetricsDto> GetFinanceMetricsAsync()
    {
        var revenue = await _context.Sales.Where(s => s.Status == "Completed").SumAsync(s => (decimal?)s.TotalAmount) ?? 0;
        var expenses = await _context.Expenses.SumAsync(e => (decimal?)e.Amount) ?? 0;
        var profit = revenue - expenses;
        var outstandingPayments = await _context.Payments.Where(p => p.Status != "Completed").SumAsync(p => (decimal?)p.Amount) ?? 0;
        var inventoryValue = await _context.Inventories.Include(i => i.Car).SumAsync(i => (decimal?)(i.Quantity * (i.Car != null ? i.Car.PurchasePrice : 0))) ?? 0;

        return new FinanceMetricsDto(revenue, expenses, profit, revenue - expenses, outstandingPayments, inventoryValue);
    }

    public async Task<IReadOnlyList<FinanceChartPoint>> GetFinanceChartsAsync()
    {
        var today = DateTime.UtcNow;
        var startDate = today.AddMonths(-5);

        var monthlySales = await _context.Sales
            .Where(s => s.SaleDate >= startDate)
            .GroupBy(s => new { s.SaleDate.Year, s.SaleDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(s => s.TotalAmount) })
            .ToListAsync();

        var monthlyExpenses = await _context.Expenses
            .Where(e => e.ExpenseDate >= startDate)
            .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Total = g.Sum(e => e.Amount) })
            .ToListAsync();

        var monthlyProfit = Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var pointDate = new DateTime(today.Year, today.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-offset);
                var revenueForMonth = monthlySales.FirstOrDefault(m => m.Year == pointDate.Year && m.Month == pointDate.Month)?.Revenue ?? 0;
                var expenseForMonth = monthlyExpenses.FirstOrDefault(m => m.Year == pointDate.Year && m.Month == pointDate.Month)?.Total ?? 0;
                return new FinanceChartPoint(pointDate.ToString("MMM"), revenueForMonth - expenseForMonth);
            })
            .Reverse()
            .ToList();

        return monthlyProfit;
    }

    public async Task<IReadOnlyList<FinanceChartSeriesPoint>> GetCashFlowTrendAsync()
    {
        var monthlyProfit = await GetFinanceChartsAsync();
        return monthlyProfit.Select(m => new FinanceChartSeriesPoint(m.Name, m.Profit > 0 ? m.Profit : 0m, m.Profit < 0 ? Math.Abs(m.Profit) : 0m)).ToList();
    }

    public async Task<IReadOnlyList<ExpenseBreakdownItem>> GetExpenseBreakdownAsync()
    {
        var rawBreakdown = await _context.Expenses
            .GroupBy(e => e.Category)
            .Select(g => new { Category = g.Key, Total = g.Sum(e => e.Amount) })
            .ToListAsync();

        var expenseBreakdown = rawBreakdown
            .Select(g => new ExpenseBreakdownItem(g.Category, g.Total, GetCategoryColor(g.Category)))
            .ToList();

        return expenseBreakdown;
    }

    public async Task<IReadOnlyList<TransactionItem>> GetRecentTransactionsAsync()
    {
        var payments = await _context.Payments
            .OrderByDescending(p => p.PaymentDate)
            .Take(15)
            .Select(p => new TransactionItem(p.Id.ToString(), p.PaymentDate.ToString("yyyy-MM-dd"), $"Payment {p.ReferenceNumber}", "Income", p.Amount, p.Status))
            .ToListAsync();

        var expenses = await _context.Expenses
            .OrderByDescending(e => e.ExpenseDate)
            .Take(15)
            .Select(e => new TransactionItem(e.Id.ToString(), e.ExpenseDate.ToString("yyyy-MM-dd"), e.Description, "Expense", e.Amount, "Completed"))
            .ToListAsync();

        return payments.Concat(expenses)
            .OrderByDescending(tx => tx.Date)
            .Take(20)
            .ToList();
    }

    public async Task<FinanceDashboardDto> GetDashboardMetricsAsync()
    {
        var metrics = await GetFinanceMetricsAsync();

        var rawCategories = await _context.Cars
            .GroupBy(c => c.Brand)
            .Select(g => new { Brand = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .Take(6)
            .ToListAsync();

        var vehicleCategories = rawCategories
            .Select(g => new VehicleCategoryItem(g.Brand, g.Count, GetBrandColor(g.Brand)))
            .ToList();

        var now = DateTime.UtcNow;
        var startDate = now.AddMonths(-5);

        var salesTrend = await _context.Sales
            .Where(s => s.SaleDate >= startDate)
            .GroupBy(s => new { s.SaleDate.Year, s.SaleDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Sales = g.Count() })
            .ToListAsync();

        var revenueExpenses = await _context.Sales
            .Where(s => s.SaleDate >= startDate && s.Status == "Completed")
            .GroupBy(s => new { s.SaleDate.Year, s.SaleDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Revenue = g.Sum(s => s.TotalAmount) })
            .ToListAsync();

        var expenseSeries = await _context.Expenses
            .Where(e => e.ExpenseDate >= startDate)
            .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Expenses = g.Sum(e => e.Amount) })
            .ToListAsync();

        var salesTrendData = Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var pointDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-offset);
                return new FinanceChartPoint(pointDate.ToString("MMM"), salesTrend.FirstOrDefault(x => x.Year == pointDate.Year && x.Month == pointDate.Month)?.Sales ?? 0);
            })
            .Reverse()
            .ToList();

        var revenueVsExpensesData = Enumerable.Range(0, 6)
            .Select(offset =>
            {
                var pointDate = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc).AddMonths(-offset);
                return new RevenueExpensesPoint(
                    pointDate.ToString("MMM"),
                    revenueExpenses.FirstOrDefault(x => x.Year == pointDate.Year && x.Month == pointDate.Month)?.Revenue ?? 0,
                    expenseSeries.FirstOrDefault(x => x.Year == pointDate.Year && x.Month == pointDate.Month)?.Expenses ?? 0);
            })
            .Reverse()
            .ToList();

        return new FinanceDashboardDto(metrics, salesTrendData, revenueVsExpensesData, vehicleCategories);
    }

    private static string GetCategoryColor(string category)
    {
        return category switch
        {
            "Maintenance" => "#2563eb",
            "Fuel" => "#10b981",
            "Office Supplies" => "#f59e0b",
            "Marketing" => "#ec4899",
            _ => "#8b5cf6",
        };
    }

    private static string GetBrandColor(string brand)
    {
        return brand switch
        {
            "Toyota" => "#ef4444",
            "Ford" => "#3b82f6",
            "Chevrolet" => "#f59e0b",
            "Honda" => "#10b981",
            _ => "#8b5cf6",
        };
    }
}

using CarSales.Api.DTOs;
using CarSales.Api.Data;
using CarSales.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CarSales.Api.Services;

public sealed class SalesService
{
    private readonly ApplicationDbContext _context;

    public SalesService(ApplicationDbContext context)
    {
        _context = context;
    }

    public sealed record SalesMetricsDto(int TodaysSales, int MonthlySales, decimal Revenue, decimal Profit, decimal OutstandingPayments);

    public sealed record SalesListItemDto(
        string Id,
        string InvoiceNo,
        string CustomerName,
        string Vehicle,
        decimal Amount,
        string Date,
        string Status);

    public async Task<SalesMetricsDto> GetSalesMetricsAsync()
    {
        var now = DateTime.UtcNow;
        var today = now.Date;
        var monthStart = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var allSales = _context.Sales.AsQueryable();
        var completedRevenue = await _context.Sales.Where(s => s.Status == "Completed").SumAsync(s => (decimal?)s.TotalAmount) ?? 0;
        var profit = completedRevenue * 0.18m;
        var outstandingPayments = await _context.Payments.Where(p => p.Status != "Completed").SumAsync(p => (decimal?)p.Amount) ?? 0;

        return new SalesMetricsDto(
            await allSales.CountAsync(s => s.SaleDate.Date == today),
            await allSales.CountAsync(s => s.SaleDate >= monthStart),
            completedRevenue,
            profit,
            outstandingPayments
        );
    }

    public async Task<PaginatedResult<SalesListItemDto>> GetSalesAsync(int page, int limit, string? search, string? date, string? status)
    {
        var query = _context.Sales
            .Include(s => s.Customer)
            .Include(s => s.Car)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(s =>
                (s.Customer != null && s.Customer.FullName.Contains(search)) ||
                (s.Car != null && (s.Car.Brand.Contains(search) || s.Car.Model.Contains(search))));
        }

        if (!string.IsNullOrWhiteSpace(date) && DateTime.TryParse(date, out var parsedDate))
        {
            var normalizedDate = DateTime.SpecifyKind(parsedDate.Date, DateTimeKind.Utc);
            query = query.Where(s => s.SaleDate.Date == normalizedDate.Date);
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            query = query.Where(s => s.Status == status);
        }

        var total = await query.CountAsync();
        var sales = await query
            .OrderByDescending(s => s.SaleDate)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var items = sales.Select(s => new SalesListItemDto(
            s.Id.ToString(),
            $"INV{s.Id:D6}",
            s.Customer?.FullName ?? string.Empty,
            s.Car is null ? string.Empty : $"{s.Car.Brand} {s.Car.Model}",
            s.TotalAmount,
            s.SaleDate.ToString("yyyy-MM-dd"),
            s.Status
        )).ToList();

        return new PaginatedResult<SalesListItemDto>(items, total, page, limit);
    }

    public async Task<Sale> CreateSaleAsync(Sale sale)
    {
        if (sale.SaleDate == default)
        {
            sale.SaleDate = DateTime.UtcNow;
        }

        if (string.IsNullOrWhiteSpace(sale.Status))
        {
            sale.Status = "Completed";
        }

        _context.Sales.Add(sale);

        if (sale.Status == "Completed")
        {
            var car = await _context.Cars
                .Include(c => c.Inventory)
                .FirstOrDefaultAsync(c => c.Id == sale.CarId);

            if (car is not null)
            {
                car.IsAvailable = false;
                if (car.Inventory is not null)
                {
                    car.Inventory.Quantity = Math.Max(0, car.Inventory.Quantity - 1);
                    car.Inventory.LastUpdated = DateTime.UtcNow;
                }
            }
        }

        await _context.SaveChangesAsync();
        return sale;
    }
}


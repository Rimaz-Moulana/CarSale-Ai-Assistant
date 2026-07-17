using CarSales.Api.DTOs;
using CarSales.Api.Data;
using CarSales.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CarSales.Api.Services;

public sealed class ProcurementService
{
    private readonly ApplicationDbContext _context;

    public ProcurementService(ApplicationDbContext context)
    {
        _context = context;
    }

    public sealed record ProcurementMetricsDto(int ActiveOrders, int PendingDeliveries, decimal TotalSpend, int DeliveredThisMonth);

    public sealed record PurchaseOrderListItemDto(
        string Id,
        string PoNumber,
        string Supplier,
        string Status,
        string ExpectedDelivery,
        decimal TotalCost);

    public async Task<ProcurementMetricsDto> GetProcurementMetricsAsync()
    {
        var now = DateTime.UtcNow;
        var activeOrders = await _context.PurchaseOrders.CountAsync(po => po.Status != "Delivered" && po.Status != "Cancelled");
        var pendingDeliveries = await _context.PurchaseOrders.CountAsync(po => po.Status == "In Transit");
        var totalSpend = await _context.PurchaseOrders.Where(po => po.OrderDate >= now.AddDays(-30)).SumAsync(po => (decimal?)po.TotalAmount) ?? 0;
        var deliveredThisMonth = await _context.PurchaseOrders.CountAsync(po => po.Status == "Delivered" && po.OrderDate.Year == now.Year && po.OrderDate.Month == now.Month);

        return new ProcurementMetricsDto(activeOrders, pendingDeliveries, totalSpend, deliveredThisMonth);
    }

    public async Task<PaginatedResult<PurchaseOrderListItemDto>> GetPurchaseOrdersAsync(int page, int limit, string? search, string? status)
    {
        var query = _context.PurchaseOrders
            .Include(po => po.Supplier)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(po => (po.Supplier != null && po.Supplier.Name.Contains(search)) || po.Notes.Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            query = query.Where(po => po.Status == status);
        }

        var total = await query.CountAsync();
        var purchaseOrders = await query
            .OrderByDescending(po => po.OrderDate)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var items = purchaseOrders.Select(po => new PurchaseOrderListItemDto(
            po.Id.ToString(),
            $"PO{po.Id:D6}",
            po.Supplier?.Name ?? string.Empty,
            po.Status,
            po.OrderDate.AddDays(7).ToString("yyyy-MM-dd"),
            po.TotalAmount
        )).ToList();

        return new PaginatedResult<PurchaseOrderListItemDto>(items, total, page, limit);
    }

    public async Task<PurchaseOrder> CreatePurchaseOrderAsync(PurchaseOrder purchaseOrder)
    {
        if (purchaseOrder.OrderDate == default)
        {
            purchaseOrder.OrderDate = DateTime.UtcNow;
        }

        if (string.IsNullOrWhiteSpace(purchaseOrder.Status))
        {
            purchaseOrder.Status = "Pending";
        }

        _context.PurchaseOrders.Add(purchaseOrder);
        await _context.SaveChangesAsync();
        return purchaseOrder;
    }
}


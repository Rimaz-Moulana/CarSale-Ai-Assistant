using CarSales.Api.Data;
using CarSales.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CarSales.Api.Services;

public sealed class InventoryService
{
    private readonly ApplicationDbContext _context;

    public InventoryService(ApplicationDbContext context)
    {
        _context = context;
    }

    public sealed record InventoryMetricsDto(
        int TotalVehicles,
        int AvailableStock,
        int Reserved,
        int Sold,
        int LowStock,
        decimal InventoryValue);

    public sealed record InventoryListItemDto(
        string Id,
        string Vehicle,
        int Quantity,
        string Location,
        string Status,
        int ReorderLevel);

    public sealed record InventoryStatusUpdate(string Status);

    public async Task<InventoryMetricsDto> GetInventoryMetricsAsync()
    {
        var inventory = _context.Inventories.Include(i => i.Car);

        var totalVehicles = await inventory.SumAsync(i => (int?)i.Quantity) ?? 0;
        var availableStock = await inventory.Where(i => i.Quantity > 0).SumAsync(i => (int?)i.Quantity) ?? 0;
        var reserved = await inventory.Where(i => i.Quantity <= 2 && i.Quantity > 0).CountAsync();
        var sold = await inventory.Where(i => i.Quantity == 0).CountAsync();
        var lowStock = await inventory.Where(i => i.Quantity > 0 && i.Quantity <= 2).CountAsync();
        var inventoryValue = await inventory.SumAsync(i => (decimal?)(i.Quantity * (i.Car != null ? i.Car.PurchasePrice : 0))) ?? 0;

        return new InventoryMetricsDto(totalVehicles, availableStock, reserved, sold, lowStock, inventoryValue);
    }

    public async Task<PaginatedResult<InventoryListItemDto>> GetInventoryListAsync(int page, int limit, string? search, string? location)
    {
        var query = _context.Inventories.Include(i => i.Car).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(i => i.Car != null && (i.Car.Brand.Contains(search) || i.Car.Model.Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(location) && location != "All")
        {
            query = query.Where(i => i.Location.Contains(location));
        }

        var total = await query.CountAsync();
        var inventory = await query
            .OrderBy(i => i.Id)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var items = inventory.Select(i => new InventoryListItemDto(
            i.Id.ToString(),
            i.Car is null ? string.Empty : $"{i.Car.Brand} {i.Car.Model}",
            i.Quantity,
            i.Location,
            GetInventoryStatus(i.Quantity),
            2
        )).ToList();

        return new PaginatedResult<InventoryListItemDto>(items, total, page, limit);
    }

    public async Task<InventoryListItemDto?> UpdateInventoryStatusAsync(int id, InventoryStatusUpdate update)
    {
        var inventory = await _context.Inventories.Include(i => i.Car).FirstOrDefaultAsync(i => i.Id == id);
        if (inventory is null)
        {
            return null;
        }

        inventory.LastUpdated = DateTime.UtcNow;

        if (string.Equals(update.Status, "Reserved", StringComparison.OrdinalIgnoreCase))
        {
            inventory.Quantity = Math.Max(0, inventory.Quantity - 1);
        }
        else if (string.Equals(update.Status, "Sold", StringComparison.OrdinalIgnoreCase))
        {
            inventory.Quantity = 0;
        }
        else if (string.Equals(update.Status, "Available", StringComparison.OrdinalIgnoreCase) && inventory.Quantity == 0)
        {
            inventory.Quantity = 1;
        }

        await _context.SaveChangesAsync();

        return new InventoryListItemDto(
            inventory.Id.ToString(),
            inventory.Car is null ? string.Empty : $"{inventory.Car.Brand} {inventory.Car.Model}",
            inventory.Quantity,
            inventory.Location,
            GetInventoryStatus(inventory.Quantity),
            2
        );
    }

    private static string GetInventoryStatus(int quantity)
    {
        return quantity switch
        {
            0 => "Sold",
            <= 2 => "Low Stock",
            _ => "Available"
        };
    }
}

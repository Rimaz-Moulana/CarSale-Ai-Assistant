using CarSales.Api.DTOs;
using CarSales.Api.Data;
using CarSales.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CarSales.Api.Services;

public sealed class CarsService
{
    private readonly ApplicationDbContext _context;

    public CarsService(ApplicationDbContext context)
    {
        _context = context;
    }

    public sealed record CarListItemDto(
        string Id,
        string Vin,
        string Make,
        string Model,
        int Year,
        decimal Price,
        string Status,
        int Quantity,
        string ImageUrl);

    public sealed record CarDetailDto(
        string Id,
        string Vin,
        string Make,
        string Model,
        int Year,
        decimal Price,
        string Status,
        int Quantity,
        string ImageUrl,
        string Supplier);

    public async Task<PaginatedResult<CarListItemDto>> GetCarsAsync(int page, int limit, string? search, string? status)
    {
        var query = _context.Cars
            .Include(c => c.Inventory)
            .Include(c => c.Supplier)
            .Include(c => c.Sales)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c => c.Brand.Contains(search) || c.Model.Contains(search) || c.Vin.Contains(search));
        }

        if (!string.IsNullOrWhiteSpace(status) && status != "All")
        {
            query = status switch
            {
                "Available" => query.Where(c => c.IsAvailable),
                "Sold" => query.Where(c => !c.IsAvailable && c.Sales.All(s => s.Status != "Pending")),
                "Pending" => query.Where(c => c.Sales.Any(s => s.Status == "Pending")),
                _ => query
            };
        }

        var total = await query.CountAsync();
        var cars = await query
            .OrderBy(c => c.Id)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var items = cars.Select(c => new CarListItemDto(
            c.Id.ToString(),
            c.Vin,
            c.Brand,
            c.Model,
            c.Year,
            c.SellingPrice,
            GetStatus(c),
            c.Inventory?.Quantity ?? 0,
            string.Empty
        )).ToList();

        return new PaginatedResult<CarListItemDto>(items, total, page, limit);
    }

    public async Task<CarDetailDto?> GetCarByIdAsync(int id)
    {
        var car = await _context.Cars
            .Include(c => c.Inventory)
            .Include(c => c.Supplier)
            .Include(c => c.Sales)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (car is null)
        {
            return null;
        }

        return new CarDetailDto(
            car.Id.ToString(),
            car.Vin,
            car.Brand,
            car.Model,
            car.Year,
            car.SellingPrice,
            GetStatus(car),
            car.Inventory?.Quantity ?? 0,
            string.Empty,
            car.Supplier?.Name ?? string.Empty
        );
    }

    public async Task<Car> CreateCarAsync(Car car)
    {
        _context.Cars.Add(car);
        await _context.SaveChangesAsync();
        return car;
    }

    public async Task<Car?> UpdateCarAsync(int id, Car updates)
    {
        var car = await _context.Cars.FindAsync(id);
        if (car is null)
        {
            return null;
        }

        car.Brand = updates.Brand;
        car.Model = updates.Model;
        car.Year = updates.Year;
        car.Color = updates.Color;
        car.Vin = updates.Vin;
        car.PurchasePrice = updates.PurchasePrice;
        car.SellingPrice = updates.SellingPrice;
        car.IsAvailable = updates.IsAvailable;
        car.SupplierId = updates.SupplierId;

        await _context.SaveChangesAsync();
        return car;
    }

    public async Task<bool> DeleteCarAsync(int id)
    {
        var car = await _context.Cars.FindAsync(id);
        if (car is null)
        {
            return false;
        }

        _context.Cars.Remove(car);
        await _context.SaveChangesAsync();
        return true;
    }

    private static string GetStatus(Car car)
    {
        if (car.Sales.Any(s => s.Status == "Pending"))
        {
            return "Pending";
        }

        return car.IsAvailable ? "Available" : "Sold";
    }
}


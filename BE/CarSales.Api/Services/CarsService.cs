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
        string ImageUrl,
        List<string> Images);

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
        string Supplier,
        List<string> Images);

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
            c.Images != null && c.Images.Any() ? c.Images.First() : string.Empty,
            c.Images ?? new List<string>()
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
            car.Images != null && car.Images.Any() ? car.Images.First() : string.Empty,
            car.Supplier?.Name ?? string.Empty,
            car.Images ?? new List<string>()
        );
    }

    public async Task<Car> CreateCarAsync(CarRequestDto dto)
    {
        var car = new Car
        {
            Brand = dto.Make,
            Model = dto.Model,
            Year = dto.Year,
            SellingPrice = dto.Price,
            PurchasePrice = dto.Price * 0.8m,
            IsAvailable = dto.Status == "Available",
            Vin = string.IsNullOrWhiteSpace(dto.Vin) ? string.Empty : dto.Vin.Trim().ToUpperInvariant(),
            Color = dto.Color,
            Images = (dto.Images != null && dto.Images.Any())
                ? dto.Images
                : (!string.IsNullOrWhiteSpace(dto.ImageUrl) ? new List<string> { dto.ImageUrl } : new List<string>())
        };

        _context.Cars.Add(car);
        await _context.SaveChangesAsync();

        var inventory = new Inventory
        {
            CarId = car.Id,
            Quantity = dto.Quantity,
            Location = "Showroom A",
            LastUpdated = DateTime.UtcNow
        };
        _context.Inventories.Add(inventory);
        await _context.SaveChangesAsync();

        return car;
    }

    public async Task<Car?> UpdateCarAsync(int id, CarRequestDto dto)
    {
        var car = await _context.Cars
            .Include(c => c.Inventory)
            .FirstOrDefaultAsync(c => c.Id == id);
            
        if (car is null)
        {
            return null;
        }

        car.Brand = dto.Make;
        car.Model = dto.Model;
        car.Year = dto.Year;
        car.SellingPrice = dto.Price;
        car.IsAvailable = dto.Status == "Available";
        car.Vin = string.IsNullOrWhiteSpace(dto.Vin) ? string.Empty : dto.Vin.Trim().ToUpperInvariant();
        car.Color = dto.Color;
        car.Images = (dto.Images != null && dto.Images.Any())
            ? dto.Images
            : (!string.IsNullOrWhiteSpace(dto.ImageUrl) ? new List<string> { dto.ImageUrl } : new List<string>());

        if (car.Inventory is not null)
        {
            car.Inventory.Quantity = dto.Quantity;
            car.Inventory.LastUpdated = DateTime.UtcNow;
        }
        else
        {
            car.Inventory = new Inventory
            {
                CarId = car.Id,
                Quantity = dto.Quantity,
                Location = "Showroom A",
                LastUpdated = DateTime.UtcNow
            };
            _context.Inventories.Add(car.Inventory);
        }

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

    public async Task<Car?> AddCarImagesAsync(int id, List<string> imageUrls)
    {
        var car = await _context.Cars.FirstOrDefaultAsync(c => c.Id == id);
        if (car == null) return null;

        var currentImages = car.Images ?? new List<string>();
        var updatedImages = new List<string>(currentImages);
        updatedImages.AddRange(imageUrls);
        car.Images = updatedImages;
        
        await _context.SaveChangesAsync();
        return car;
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


using CarSales.Api.DTOs;
using CarSales.Api.Data;
using CarSales.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace CarSales.Api.Services;

public sealed class CustomersService
{
    private readonly ApplicationDbContext _context;

    public CustomersService(ApplicationDbContext context)
    {
        _context = context;
    }

    public sealed record CustomerListItemDto(
        string Id,
        string Name,
        string Type,
        decimal TotalSpent,
        int VehiclesPurchased,
        string Email,
        string Phone);

    public sealed record CustomerDetailDto(
        string Id,
        string Name,
        string Type,
        decimal TotalSpent,
        int VehiclesPurchased,
        string Email,
        string Phone,
        string Address);

    public async Task<PaginatedResult<CustomerListItemDto>> GetCustomersAsync(int page, int limit, string? search)
    {
        var query = _context.Customers.Include(c => c.Sales).AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(c => c.FullName.Contains(search) || c.Email.Contains(search) || c.Phone.Contains(search));
        }

        var total = await query.CountAsync();
        var customers = await query
            .OrderBy(c => c.Id)
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToListAsync();

        var items = customers.Select(c => new CustomerListItemDto(
            c.Id.ToString(),
            c.FullName,
            GetCustomerType(c.Sales.Sum(s => s.TotalAmount)),
            c.Sales.Sum(s => s.TotalAmount),
            c.Sales.Count,
            c.Email,
            c.Phone
        )).ToList();

        return new PaginatedResult<CustomerListItemDto>(items, total, page, limit);
    }

    public async Task<CustomerDetailDto?> GetCustomerByIdAsync(int id)
    {
        var customer = await _context.Customers.Include(c => c.Sales).FirstOrDefaultAsync(c => c.Id == id);
        if (customer is null)
        {
            return null;
        }

        var totalSpent = customer.Sales.Sum(s => s.TotalAmount);

        return new CustomerDetailDto(
            customer.Id.ToString(),
            customer.FullName,
            GetCustomerType(totalSpent),
            totalSpent,
            customer.Sales.Count,
            customer.Email,
            customer.Phone,
            customer.Address
        );
    }

    public async Task<Customer> CreateCustomerAsync(Customer customer)
    {
        _context.Customers.Add(customer);
        await _context.SaveChangesAsync();
        return customer;
    }

    private static string GetCustomerType(decimal totalSpent)
    {
        return totalSpent switch
        {
            >= 50000 => "Corporate",
            >= 15000 => "Retail",
            _ => "Government",
        };
    }
}


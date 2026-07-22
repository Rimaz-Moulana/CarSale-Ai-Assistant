using CarSales.Api.Models;
using CarSales.Api.Services;
using CarSales.Api.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarSales.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CustomersController : ControllerBase
{
    private readonly CustomersService _service;

    public CustomersController(CustomersService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetCustomers(int page = 1, int limit = 10, string search = "")
    {
        var result = await _service.GetCustomersAsync(page, limit, search);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetCustomer(int id)
    {
        var customer = await _service.GetCustomerByIdAsync(id);
        if (customer is null)
        {
            return NotFound();
        }

        return Ok(customer);
    }

    [HttpPost]
    public async Task<ActionResult<CustomerResponseDto>> CreateCustomer(CreateCustomerDto dto)
    {
        var created = await _service.CreateCustomerAsync(dto);
        return CreatedAtAction(nameof(GetCustomer), new { id = created.Id }, created);
    }
}


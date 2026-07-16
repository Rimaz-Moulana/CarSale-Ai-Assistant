using CarSales.Api.Models;
using CarSales.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CarSales.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SalesController : ControllerBase
{
    private readonly SalesService _service;

    public SalesController(SalesService service)
    {
        _service = service;
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<object>> GetSalesMetrics()
    {
        var metrics = await _service.GetSalesMetricsAsync();
        return Ok(metrics);
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetSales(
        int page = 1,
        int limit = 10,
        string search = "",
        string date = "",
        string status = "")
    {
        var result = await _service.GetSalesAsync(page, limit, search, date, status);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<Sale>> CreateSale(Sale sale)
    {
        var created = await _service.CreateSaleAsync(sale);
        return CreatedAtAction(nameof(GetSales), new { id = created.Id }, created);
    }
}

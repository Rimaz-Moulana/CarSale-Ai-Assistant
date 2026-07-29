using CarSales.Api.Models;
using CarSales.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarSales.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProcurementController : ControllerBase
{
    private readonly ProcurementService _service;

    public ProcurementController(ProcurementService service)
    {
        _service = service;
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<object>> GetProcurementMetrics()
    {
        var metrics = await _service.GetProcurementMetricsAsync();
        return Ok(metrics);
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetPurchaseOrders(
        int page = 1,
        int limit = 10,
        string search = "",
        string status = "")
    {
        var result = await _service.GetPurchaseOrdersAsync(page, limit, search, status);
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreatePurchaseOrder(CarSales.Api.DTOs.CreatePurchaseOrderRequestDto dto)
    {
        var created = await _service.CreatePurchaseOrderAsync(dto);
        var result = new
        {
            id = created.Id,
            poNumber = $"PO{created.Id:D6}",
            supplier = dto.Supplier,
            status = created.Status,
            expectedDelivery = created.OrderDate.ToString("yyyy-MM-dd"),
            totalCost = created.TotalAmount
        };
        return CreatedAtAction(nameof(GetPurchaseOrders), new { id = created.Id }, result);
    }
}


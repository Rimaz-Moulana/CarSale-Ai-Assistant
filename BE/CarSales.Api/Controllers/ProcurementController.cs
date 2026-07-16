using CarSales.Api.Models;
using CarSales.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CarSales.Api.Controllers;

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
    public async Task<ActionResult<PurchaseOrder>> CreatePurchaseOrder(PurchaseOrder purchaseOrder)
    {
        var created = await _service.CreatePurchaseOrderAsync(purchaseOrder);
        return CreatedAtAction(nameof(GetPurchaseOrders), new { id = created.Id }, created);
    }
}

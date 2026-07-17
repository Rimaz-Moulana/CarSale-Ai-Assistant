using CarSales.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarSales.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class InventoryController : ControllerBase
{
    private readonly InventoryService _service;

    public InventoryController(InventoryService service)
    {
        _service = service;
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<object>> GetInventoryMetrics()
    {
        var metrics = await _service.GetInventoryMetricsAsync();
        return Ok(metrics);
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetInventoryList(
        int page = 1,
        int limit = 10,
        string search = "",
        string location = "")
    {
        var result = await _service.GetInventoryListAsync(page, limit, search, location);
        return Ok(result);
    }

    [HttpPatch("{id}/status")]
    public async Task<ActionResult<object>> UpdateInventoryStatus(int id, [FromBody] InventoryService.InventoryStatusUpdate update)
    {
        var inventory = await _service.UpdateInventoryStatusAsync(id, update);
        if (inventory is null)
        {
            return NotFound();
        }

        return Ok(inventory);
    }
}


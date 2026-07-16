using CarSales.Api.Models;
using CarSales.Api.Services;
using Microsoft.AspNetCore.Mvc;

namespace CarSales.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CarsController : ControllerBase
{
    private readonly CarsService _service;

    public CarsController(CarsService service)
    {
        _service = service;
    }

    [HttpGet]
    public async Task<ActionResult<object>> GetCars(
        int page = 1,
        int limit = 10,
        string search = "",
        string status = "")
    {
        var result = await _service.GetCarsAsync(page, limit, search, status);
        return Ok(result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<object>> GetCar(int id)
    {
        var car = await _service.GetCarByIdAsync(id);
        if (car is null)
        {
            return NotFound();
        }

        return Ok(car);
    }

    [HttpPost]
    public async Task<ActionResult<Car>> CreateCar(Car car)
    {
        var created = await _service.CreateCarAsync(car);
        return CreatedAtAction(nameof(GetCar), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Car>> UpdateCar(int id, Car updates)
    {
        var updated = await _service.UpdateCarAsync(id, updates);
        if (updated is null)
        {
            return NotFound();
        }

        return Ok(updated);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCar(int id)
    {
        var deleted = await _service.DeleteCarAsync(id);
        if (!deleted)
        {
            return NotFound();
        }

        return NoContent();
    }
}

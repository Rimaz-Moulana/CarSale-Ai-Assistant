using CarSales.Api.DTOs;
using CarSales.Api.Models;
using CarSales.Api.Services;
using CarSales.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.IO;

namespace CarSales.Api.Controllers;

[Authorize]
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
    public async Task<ActionResult<Car>> CreateCar(CarRequestDto car)
    {
        var created = await _service.CreateCarAsync(car);
        return CreatedAtAction(nameof(GetCar), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    public async Task<ActionResult<Car>> UpdateCar(int id, CarRequestDto updates)
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

    [HttpPost("{id}/images")]
    [Consumes("multipart/form-data")]
    [DisableRequestSizeLimit]
    public async Task<ActionResult<List<string>>> UploadImages(
        int id, 
        [FromForm] List<IFormFile> files,
        [FromServices] IImageEmbeddingService embeddingService,
        [FromServices] ApplicationDbContext context)
    {
        if (files == null || files.Count == 0)
        {
            return BadRequest("No files uploaded.");
        }

        var car = await _service.GetCarByIdAsync(id);
        if (car == null)
        {
            return NotFound("Car not found.");
        }

        var uploadedUrls = new List<string>();
        var safeVin = string.IsNullOrWhiteSpace(car.Vin) ? "unknown" : car.Vin.Trim();
        var uploadFolder = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "images", "cars", safeVin);

        if (!Directory.Exists(uploadFolder))
        {
            Directory.CreateDirectory(uploadFolder);
        }

        var baseUrl = $"{Request.Scheme}://{Request.Host}{Request.PathBase}";

        foreach (var file in files)
        {
            if (file.Length == 0) continue;

            try
            {
                // 1. Read file bytes and compute hash
                using var fileStream = file.OpenReadStream();
                using var ms = new MemoryStream();
                await fileStream.CopyToAsync(ms);
                var fileBytes = ms.ToArray();

                string hash = "";
                using (var sha256 = System.Security.Cryptography.SHA256.Create())
                {
                    var hashBytes = sha256.ComputeHash(fileBytes);
                    hash = BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
                }

                // 2. Save the file to disk
                var fileName = Path.GetFileName(file.FileName);
                var filePath = Path.Combine(uploadFolder, fileName);
                await System.IO.File.WriteAllBytesAsync(filePath, fileBytes);

                var relativeUrl = $"/images/cars/{safeVin}/{fileName}";
                var fullUrl = $"{baseUrl}{relativeUrl}";
                uploadedUrls.Add(fullUrl);

                // 3. Precompute embedding and save to cache if not exists
                try
                {
                    var cached = await context.DropboxImages
                        .FirstOrDefaultAsync(i => i.ContentHash == hash && i.Embedding != null);

                    if (cached == null)
                    {
                        ms.Position = 0;
                        var embedding = await embeddingService.GenerateEmbeddingAsync(ms, file.ContentType, HttpContext.RequestAborted);
                        
                        var cacheEntry = new DropboxImage
                        {
                            DropboxVehicleId = null,
                            DropboxFileId = "app_ref_" + Guid.NewGuid().ToString("N"),
                            FileName = fileName,
                            PathDisplay = fullUrl,
                            ContentHash = hash,
                            MimeType = file.ContentType,
                            Embedding = embedding,
                            EmbeddingModel = "gemini-embedding-2",
                            EmbeddingVersion = "1.0"
                        };
                        context.DropboxImages.Add(cacheEntry);
                        await context.SaveChangesAsync();
                    }
                }
                catch (Exception ex)
                {
                    // Log error but do not fail the upload process
                    Console.WriteLine($"Failed to precompute embedding for uploaded image {fileName}: {ex.Message}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to process uploaded file {file.FileName}: {ex.Message}");
            }
        }

        var carEntity = await _service.AddCarImagesAsync(id, uploadedUrls);
        if (carEntity == null)
        {
            return StatusCode(500, "Failed to save image links to database.");
        }

        return Ok(uploadedUrls);
    }
}


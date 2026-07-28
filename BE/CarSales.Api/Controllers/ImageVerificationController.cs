using System;
using System.Threading.Tasks;
using System.Collections.Generic;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using CarSales.Api.Models;
using CarSales.Api.Services;
using CarSales.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace CarSales.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ImageVerificationController : ControllerBase
{
    private readonly ImageVerificationService _service;
    private readonly ApplicationDbContext _context;

    public ImageVerificationController(ImageVerificationService service, ApplicationDbContext context)
    {
        _service = service;
        _context = context;
    }

    [HttpGet("history")]
    public async Task<ActionResult<object>> GetHistory()
    {
        var requests = await _context.VehicleMatchRequests
            .Include(r => r.Car)
            .Include(r => r.ImageMatches)
                .ThenInclude(m => m.DropboxImage)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        var result = requests.Select(r => new {
            id = r.Id,
            carId = r.CarId,
            car = r.Car,
            chassisNumber = r.Vin,
            status = r.Decision == "MATCH" ? "Passed" : (r.Decision == "NO_MATCH" ? "Failed" : "Pending Review"),
            dropboxPath = r.Vin,
            resultNotes = GetNotes(r),
            mismatchedFiles = string.Join(",", r.ImageMatches.Where(m => m.Decision != "MATCH").Select(m => m.DropboxImage?.FileName ?? "")),
            checkedAt = r.CreatedAt,
            overallScore = r.OverallScore,
            confidence = r.Confidence,
            decision = r.Decision,
            matches = r.ImageMatches.Select(m => new {
                applicationImage = m.VehicleImageId,
                dropboxImageName = m.DropboxImage?.FileName ?? "",
                dropboxImagePath = m.DropboxImage?.PathDisplay ?? "",
                similarity = m.SimilarityScore,
                decision = m.Decision,
                explanation = "" // Gemini visual logs
            }).ToList()
        }).ToList();

        return Ok(result);
    }

    [HttpPost("verify/{carId}")]
    public async Task<ActionResult<CarImageVerification>> VerifyVehicle(int carId)
    {
        try
        {
            var result = await _service.VerifyVehicleAsync(carId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal error during verification: {ex.Message}");
        }
    }

    [HttpPost("verify-all")]
    public async Task<ActionResult<List<CarImageVerification>>> VerifyAll()
    {
        try
        {
            var results = await _service.VerifyAllSyncFoldersAsync();
            return Ok(results);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal error: {ex.Message}");
        }
    }

    public class VerifyFolderRequest
    {
        public string FolderPath { get; set; } = string.Empty;
        public int? CarId { get; set; }
    }

    [HttpPost("verify-folder")]
    public async Task<ActionResult<CarImageVerification>> VerifyFolder([FromBody] VerifyFolderRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FolderPath))
        {
            return BadRequest("Folder path is required.");
        }

        try
        {
            var result = await _service.VerifyFolderAsync(request.FolderPath, request.CarId);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Verification error: {ex.Message}");
        }
    }

    [HttpPost("verify-match/{vin}")]
    public async Task<ActionResult<VehicleMatchResult>> VerifyMatch(string vin, [FromServices] IVehicleImageMatchingService matchingService)
    {
        if (string.IsNullOrWhiteSpace(vin))
        {
            return BadRequest("VIN/Chassis number is required.");
        }

        try
        {
            var result = await matchingService.MatchVehicleAsync(vin, HttpContext.RequestAborted);
            if (result.Status == "FAILED")
            {
                return BadRequest(result);
            }
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Internal error during matching process: {ex.Message}");
        }
    }

    [HttpGet("run-tests")]
    [AllowAnonymous]
    public ActionResult RunSelfTests()
    {
        var similarity = new VectorSimilarityService();
        var results = new List<string>();

        // Test 1: Identical vectors
        float[] v1 = new[] { 1.0f, 0.0f, 0.0f };
        float[] v2 = new[] { 1.0f, 0.0f, 0.0f };
        double sim1 = similarity.CalculateCosineSimilarity(v1, v2);
        results.Add($"Test 1 (Identical): Expected 1.0, Got {sim1:F4} - {(Math.Abs(sim1 - 1.0) < 0.0001 ? "PASSED" : "FAILED")}");

        // Test 2: Orthogonal vectors
        float[] v3 = new[] { 1.0f, 0.0f, 0.0f };
        float[] v4 = new[] { 0.0f, 1.0f, 0.0f };
        double sim2 = similarity.CalculateCosineSimilarity(v3, v4);
        results.Add($"Test 2 (Orthogonal): Expected 0.0, Got {sim2:F4} - {(Math.Abs(sim2 - 0.0) < 0.0001 ? "PASSED" : "FAILED")}");

        // Test 3: Opposite vectors
        float[] v5 = new[] { 1.0f, 0.0f, 0.0f };
        float[] v6 = new[] { -1.0f, 0.0f, 0.0f };
        double sim3 = similarity.CalculateCosineSimilarity(v5, v6);
        results.Add($"Test 3 (Opposite): Expected -1.0, Got {sim3:F4} - {(Math.Abs(sim3 - -1.0) < 0.0001 ? "PASSED" : "FAILED")}");

        // Test 4: Mismatched lengths
        try
        {
            similarity.CalculateCosineSimilarity(new float[3], new float[4]);
            results.Add("Test 4 (Mismatched length): Expected ArgumentException - FAILED");
        }
        catch (ArgumentException)
        {
            results.Add("Test 4 (Mismatched length): Expected ArgumentException - PASSED");
        }

        return Ok(results);
    }

    public class OverrideRequest
    {
        public string Status { get; set; } = string.Empty;
        public string Notes { get; set; } = string.Empty;
    }

    [HttpPost("override/{id}")]
    public async Task<ActionResult<CarImageVerification>> OverrideStatus(int id, [FromBody] OverrideRequest request)
    {
        var result = await _service.OverrideStatusAsync(id, request.Status, request.Notes);
        if (result == null)
        {
            return NotFound($"Verification record with ID {id} not found.");
        }
        return Ok(result);
    }

    [HttpGet("folders")]
    public async Task<ActionResult<List<DropboxFolderDto>>> GetFolders([FromQuery] string path = "")
    {
        try
        {
            var folders = await _service.ListFoldersAsync(path);
            return Ok(folders);
        }
        catch (Exception ex)
        {
            return StatusCode(500, $"Error listing folders: {ex.Message}");
        }
    }

    [HttpGet("files/{chassisNumber}")]
    public async Task<ActionResult<List<string>>> GetFiles(string chassisNumber)
    {
        var files = await _service.GetDropboxImageFilesAsync(chassisNumber);
        return Ok(files);
    }

    [HttpGet("image")]
    [AllowAnonymous] // Allow viewing images directly in HTML img tags
    public async Task<IActionResult> GetImage([FromQuery] string chassisNumber, [FromQuery] string file)
    {
        if (string.IsNullOrWhiteSpace(chassisNumber) || string.IsNullOrWhiteSpace(file))
        {
            return BadRequest("Chassis number and file name are required.");
        }

        // Avoid directory traversal attacks
        if (chassisNumber.Contains("..") || file.Contains("..") || chassisNumber.Contains("/") || chassisNumber.Contains("\\"))
        {
            return BadRequest("Invalid path parameters.");
        }

        var bytes = await _service.GetDropboxImageContentAsync(chassisNumber, file);
        if (bytes == null)
        {
            return NotFound("Image not found.");
        }

        var ext = System.IO.Path.GetExtension(file).ToLowerInvariant();
        var mimeType = ext == ".png" ? "image/png" : "image/jpeg";

        return File(bytes, mimeType);
    }

    // --- DROPBOX WEBHOOK ENDPOINTS ---

    [HttpGet("webhook")]
    [AllowAnonymous]
    public IActionResult GetWebhook([FromQuery] string challenge)
    {
        if (string.IsNullOrEmpty(challenge))
        {
            return BadRequest("Challenge parameter is required.");
        }
        // Dropbox requires returning the challenge parameter value as a plain-text response
        return Content(challenge, "text/plain");
    }

    [HttpPost("webhook")]
    [AllowAnonymous]
    public IActionResult PostWebhook()
    {
        // Run sync as background task to avoid blocking the webhook response (Dropbox requires a fast response)
        _ = Task.Run(async () =>
        {
            try
            {
                await _service.VerifyAllSyncFoldersAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Dropbox webhook auto-sync error: {ex.Message}");
            }
        });

        return Ok();
    }

    private static string GetNotes(VehicleMatchRequest r)
    {
        var sb = new System.Text.StringBuilder();
        sb.AppendLine($"Overall Vector similarity: {r.OverallScore:P1}");
        sb.AppendLine($"Confidence level: {r.Confidence}");
        sb.AppendLine($"Audit decision: {r.Decision}");
        sb.AppendLine();
        sb.AppendLine("Details of matches:");
        foreach (var m in r.ImageMatches)
        {
            sb.AppendLine($"- {System.IO.Path.GetFileName(m.VehicleImageId)} matches {m.DropboxImage?.FileName} with similarity {m.SimilarityScore:P1} ({m.Decision})");
        }
        return sb.ToString();
    }
}

using CarSales.Api.Models;
using CarSales.Api.Services;
using Microsoft.AspNetCore.Mvc;
using System.Linq;

namespace CarSales.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly AiAgentService _agent;

    public AiController(AiAgentService agent)
    {
        _agent = agent;
    }

    [HttpGet("health")]
    public async Task<IActionResult> Health()
    {
        if (await _agent.IsHealthyAsync())
        {
            return Ok(new { status = "ok" });
        }

        return StatusCode(StatusCodes.Status503ServiceUnavailable, new { status = "unavailable", detail = "Cannot connect to Ollama." });
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AiChatRequest request)
    {
        var history = request.History?.Select(m => new AiAgentService.ChatMessageDto(m.Role, m.Content))
            ?? Enumerable.Empty<AiAgentService.ChatMessageDto>();

        try
        {
            var assistantText = await _agent.ChatAsync(request.Message, history);
            return Ok(new { content = assistantText });
        }
        catch (HttpRequestException ex)
        {
            return Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status503ServiceUnavailable,
                title: "AI service unavailable"
            );
        }
        catch (Exception ex)
        {
            return Problem(
                detail: ex.Message,
                statusCode: StatusCodes.Status500InternalServerError,
                title: "AI service error"
            );
        }
    }
}
using CarSales.Api.DTOs;
using CarSales.Api.Models;
using CarSales.Api.Services;
using CarSales.Api.Data;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace CarSales.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly AiAgentService _agent;
    private readonly ApplicationDbContext _context;

    public AiController(AiAgentService agent, ApplicationDbContext context)
    {
        _agent = agent;
        _context = context;
    }

    [HttpGet("health")]
    public async Task<IActionResult> Health()
    {
        if (await _agent.IsHealthyAsync()) return Ok(new { status = "ok" });
        return StatusCode(StatusCodes.Status503ServiceUnavailable, new { status = "unavailable", detail = "Cannot connect to Ollama." });
    }

    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions()
    {
        var sessions = await _context.ChatSessions
            .OrderByDescending(s => s.UpdatedAt)
            .Select(s => new { s.Id, s.Title, s.CreatedAt, s.UpdatedAt })
            .ToListAsync();
        return Ok(sessions);
    }

    [HttpGet("sessions/{id}")]
    public async Task<IActionResult> GetSession(Guid id)
    {
        var session = await _context.ChatSessions
            .Include(s => s.Messages.OrderBy(m => m.CreatedAt))
            .FirstOrDefaultAsync(s => s.Id == id);
            
        if (session == null) return NotFound();
        return Ok(session);
    }

    [HttpPost("sessions")]
    public async Task<IActionResult> CreateSession()
    {
        var session = new ChatSession();
        _context.ChatSessions.Add(session);
        await _context.SaveChangesAsync();
        return Ok(session);
    }

    [HttpDelete("sessions/{id}")]
    public async Task<IActionResult> DeleteSession(Guid id)
    {
        var session = await _context.ChatSessions.FindAsync(id);
        if (session == null) return NotFound();
        _context.ChatSessions.Remove(session);
        await _context.SaveChangesAsync();
        return NoContent();
    }

    [HttpPost("chat")]
    public async Task<IActionResult> Chat([FromBody] AiChatRequest request)
    {
        ChatSession? session = null;
        if (request.SessionId.HasValue && request.SessionId.Value != Guid.Empty)
        {
            session = await _context.ChatSessions.FindAsync(request.SessionId.Value);
            if (session == null) return NotFound("Session not found");
        }
        else
        {
            session = new ChatSession { Title = request.Message.Substring(0, Math.Min(request.Message.Length, 30)) + "..." };
            _context.ChatSessions.Add(session);
        }

        var historyMsgs = session.Id == Guid.Empty ? new List<ChatMessage>() : await _context.ChatMessages
            .Where(m => m.ChatSessionId == session.Id)
            .OrderBy(m => m.CreatedAt)
            .ToListAsync();

        var userMessage = new ChatMessage
        {
            ChatSessionId = session.Id,
            Role = "user",
            Content = request.Message
        };
        _context.ChatMessages.Add(userMessage);
        
        session.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(); // Save user message and/or new session so it gets an ID

        var historyDtos = historyMsgs.Select(m => new ChatMessageDto(m.Role, m.Content));

        try
        {
            var assistantText = await _agent.ChatAsync(request.Message, historyDtos);
            
            var aiMessage = new ChatMessage
            {
                ChatSessionId = session.Id,
                Role = "assistant",
                Content = assistantText
            };
            _context.ChatMessages.Add(aiMessage);
            await _context.SaveChangesAsync();

            return Ok(new { content = assistantText, sessionId = session.Id });
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


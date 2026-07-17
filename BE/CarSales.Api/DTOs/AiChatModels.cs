namespace CarSales.Api.DTOs;

public sealed record ChatMessageDto(string Role, string Content);
public sealed record AiChatRequest(string Message, Guid? SessionId);
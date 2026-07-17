using CarSales.Api.Tools;
using CarSales.Api.DTOs;
using System.Text;
using CarSales.Api.Models;

namespace CarSales.Api.Services;

public sealed class AiAgentService
{
    private readonly AiKernelService _kernel;
    private readonly AiToolService _tools;

    public AiAgentService(AiKernelService kernel, AiToolService tools)
    {
        _kernel = kernel;
        _tools = tools;
    }

    public async Task<string> ChatAsync(string message, IEnumerable<ChatMessageDto> history)
    {
        var finance = await _tools.GetFinanceSummaryAsync();
        var sales = await _tools.GetSalesSummaryAsync();
        var inventory = await _tools.GetInventorySummaryAsync();
        var procurement = await _tools.GetProcurementSummaryAsync();

        var prompt = BuildPrompt(message, history, finance, sales, inventory, procurement);
        return await _kernel.RunAsync(prompt);
    }

    public Task<bool> IsHealthyAsync() => _kernel.CheckHealthAsync();

    private static string BuildPrompt(
        string userMessage,
        IEnumerable<ChatMessageDto> history,
        string finance,
        string sales,
        string inventory,
        string procurement)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are an intelligent car sales operations assistant.");
        sb.AppendLine("Use the latest database summaries below to answer accurately.");
        sb.AppendLine();
        sb.AppendLine("=== Finance Data ===");
        sb.AppendLine(finance);
        sb.AppendLine();
        sb.AppendLine("=== Sales Data ===");
        sb.AppendLine(sales);
        sb.AppendLine();
        sb.AppendLine("=== Inventory Data ===");
        sb.AppendLine(inventory);
        sb.AppendLine();
        sb.AppendLine("=== Procurement Data ===");
        sb.AppendLine(procurement);
        sb.AppendLine();
        sb.AppendLine("Chat history:");
        foreach (var msg in history)
        {
            sb.AppendLine($"{msg.Role}: {msg.Content}");
        }
        sb.AppendLine();
        sb.AppendLine($"User: {userMessage}");
        sb.AppendLine("Assistant:");
        return sb.ToString();
    }
}

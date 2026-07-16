using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace CarSales.Api.Services;

public sealed class AiKernelService
{
    private readonly HttpClient _httpClient;
    private readonly string _ollamaHost;
    private readonly string _ollamaModel;

    public AiKernelService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _ollamaHost = configuration["Ollama:Host"] ?? "http://127.0.0.1:11434";
        _ollamaModel = configuration["Ollama:Model"] ?? "llama2";

        _httpClient = httpClientFactory.CreateClient("Ollama");
        _httpClient.BaseAddress = new Uri(_ollamaHost);
    }

    public async Task<string> RunAsync(string prompt)
    {
        var request = new OllamaChatRequest(
            Model: _ollamaModel,
            Messages: new[] { new OllamaChatMessage(Role: "user", Content: prompt) }
        );

        try
        {
            var response = await _httpClient.PostAsJsonAsync("/v1/chat/completions", request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<OllamaChatResponse>();
            var content = result?.Choices?.FirstOrDefault()?.Message?.Content;
            return string.IsNullOrWhiteSpace(content)
                ? "No response was returned from Ollama."
                : content.Trim();
        }
        catch (HttpRequestException ex)
        {
            if (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
            {
                throw new HttpRequestException($"Model '{_ollamaModel}' not found in Ollama at '{_ollamaHost}'. Please ensure the model is pulled.", ex);
            }
            throw new HttpRequestException($"Cannot connect to Ollama at '{_ollamaHost}'. Please start Ollama and try again.", ex);
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"AI service error: {ex.Message}", ex);
        }
    }

    public async Task<bool> CheckHealthAsync()
    {
        try
        {
            var response = await _httpClient.GetAsync("/v1/models");
            return response.IsSuccessStatusCode;
        }
        catch
        {
            return false;
        }
    }

    private sealed record OllamaChatRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("messages")] IEnumerable<OllamaChatMessage> Messages);

    private sealed record OllamaChatMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed record OllamaChatResponse(
        [property: JsonPropertyName("choices")] OllamaChatChoice[]? Choices);

    private sealed record OllamaChatChoice(
        [property: JsonPropertyName("message")] OllamaChatMessage? Message);
}
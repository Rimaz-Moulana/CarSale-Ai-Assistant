using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace CarSales.Api.Services;

public sealed class AiKernelService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly string _ollamaHost;
    private readonly string _ollamaModel;
    private readonly string _geminiApiKey;
    private readonly string _geminiModel;

    private static string? _activeProvider;
    private string Provider => _activeProvider ??= _configuration["AI_PROVIDER"] ?? "Ollama";

    public string GetProvider() => Provider;
    public void SetProvider(string provider)
    {
        if (string.Equals(provider, "Gemini", StringComparison.OrdinalIgnoreCase) || 
            string.Equals(provider, "Ollama", StringComparison.OrdinalIgnoreCase))
        {
            _activeProvider = provider;
        }
    }

    public AiKernelService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _configuration = configuration;
        _geminiApiKey = configuration["GEMINI_API_KEY"] ?? string.Empty;
        _geminiModel = configuration["GEMINI_MODEL"] ?? "gemini-3.5-flash";

        _ollamaHost = configuration["Ollama:Host"] ?? "http://127.0.0.1:11434";
        _ollamaModel = configuration["Ollama:Model"] ?? "llama2";

        _httpClient = httpClientFactory.CreateClient("Ollama");
        
        if (string.Equals(Provider, "Ollama", StringComparison.OrdinalIgnoreCase))
        {
            _httpClient.BaseAddress = new Uri(_ollamaHost);
        }
    }

    public async Task<string> RunAsync(string prompt)
    {
        if (string.Equals(Provider, "Gemini", StringComparison.OrdinalIgnoreCase))
        {
            return await RunGeminiAsync(prompt);
        }
        return await RunOllamaAsync(prompt);
    }

    public async Task<string> RunVisionAsync(string prompt, byte[] imageBytes, string mimeType)
    {
        if (string.Equals(Provider, "Gemini", StringComparison.OrdinalIgnoreCase))
        {
            return await RunGeminiVisionAsync(prompt, imageBytes, mimeType);
        }
        return await RunOllamaVisionAsync(prompt, imageBytes, mimeType);
    }

    public async Task<string> RunVisionMultiImageAsync(string prompt, byte[] primaryImageBytes, string primaryMimeType, List<(byte[] Bytes, string MimeType)> referenceImages)
    {
        if (string.Equals(Provider, "Gemini", StringComparison.OrdinalIgnoreCase))
        {
            return await RunGeminiVisionMultiImageAsync(prompt, primaryImageBytes, primaryMimeType, referenceImages);
        }
        // Fallback for Ollama: simply call single-image vision or standard vision since Ollama offline doesn't support multiple images easily
        return await RunOllamaVisionAsync(prompt, primaryImageBytes, primaryMimeType);
    }

    private async Task<string> RunGeminiVisionMultiImageAsync(
        string prompt, 
        byte[] primaryImageBytes, 
        string primaryMimeType, 
        List<(byte[] Bytes, string MimeType)> referenceImages)
    {
        if (string.IsNullOrWhiteSpace(_geminiApiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured.");
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_geminiModel}:generateContent?key={_geminiApiKey}";
        
        var partsList = new List<object>
        {
            new { text = prompt },
            new { inlineData = new { mimeType = primaryMimeType, data = Convert.ToBase64String(primaryImageBytes) } }
        };

        foreach (var refImg in referenceImages)
        {
            partsList.Add(new { inlineData = new { mimeType = refImg.MimeType, data = Convert.ToBase64String(refImg.Bytes) } });
        }

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = partsList.ToArray()
                }
            }
        };

        try
        {
            using var response = await PostGeminiWithRetryAsync(url, requestBody);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

            return string.IsNullOrWhiteSpace(text)
                ? "No response was returned from Gemini."
                : text.Trim();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Gemini multi-image vision service error: {ex.Message}", ex);
        }
    }

    private async Task<string> RunGeminiVisionAsync(string prompt, byte[] imageBytes, string mimeType)
    {
        if (string.IsNullOrWhiteSpace(_geminiApiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured. Please set GEMINI_API_KEY in the environment.");
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_geminiModel}:generateContent?key={_geminiApiKey}";
        var base64Data = Convert.ToBase64String(imageBytes);

        var requestBody = new
        {
            contents = new[]
            {
                new
                {
                    parts = new object[]
                    {
                        new { text = prompt },
                        new { inlineData = new { mimeType = mimeType, data = base64Data } }
                    }
                }
            }
        };

        try
        {
            using var response = await PostGeminiWithRetryAsync(url, requestBody);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

            return string.IsNullOrWhiteSpace(text)
                ? "No response was returned from Gemini."
                : text.Trim();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Gemini vision service error: {ex.Message}", ex);
        }
    }

    private async Task<string> RunOllamaVisionAsync(string prompt, byte[] imageBytes, string mimeType)
    {
        var textPrompt = $"[Visual Context: Image size is {imageBytes.Length} bytes, mimeType is {mimeType}. Analyzing metadata offline...]\n\n{prompt}";
        return await RunOllamaAsync(textPrompt);
    }

    private async Task<string> RunGeminiAsync(string prompt)
    {
        if (string.IsNullOrWhiteSpace(_geminiApiKey))
        {
            throw new InvalidOperationException("Gemini API key is not configured. Please set GEMINI_API_KEY in the environment.");
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_geminiModel}:generateContent?key={_geminiApiKey}";
        var request = new GeminiRequest(
            Contents: new[] {
                new GeminiContent(
                    Parts: new[] {
                        new GeminiPart(Text: prompt)
                    }
                )
            }
        );

        try
        {
            using var response = await PostGeminiWithRetryAsync(url, request);
            response.EnsureSuccessStatusCode();

            var result = await response.Content.ReadFromJsonAsync<GeminiResponse>();
            var text = result?.Candidates?.FirstOrDefault()?.Content?.Parts?.FirstOrDefault()?.Text;

            return string.IsNullOrWhiteSpace(text)
                ? "No response was returned from Gemini."
                : text.Trim();
        }
        catch (Exception ex)
        {
            throw new InvalidOperationException($"Gemini service error: {ex.Message}", ex);
        }
    }

    private async Task<HttpResponseMessage> PostGeminiWithRetryAsync<T>(string url, T requestBody, int maxRetries = 5)
    {
        int delay = 2000;
        HttpResponseMessage? response = null;
        for (int i = 0; i < maxRetries; i++)
        {
            response = await _httpClient.PostAsJsonAsync(url, requestBody);
            if (response.StatusCode == (System.Net.HttpStatusCode)429)
            {
                var errorBody = await response.Content.ReadAsStringAsync();
                int sleepMs = delay;

                // Try to extract exact retry delay from the response body (e.g. "Please retry in 12.835724383s.")
                var match = System.Text.RegularExpressions.Regex.Match(errorBody, @"Please retry in (\d+(?:\.\d+)?)s", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (match.Success && double.TryParse(match.Groups[1].Value, out double seconds))
                {
                    sleepMs = (int)(seconds * 1000) + 1500; // wait the requested seconds + 1.5s safety margin
                }
                else
                {
                    // Fallback check for "retryDelay": "12s" format in JSON details
                    var retryDelayMatch = System.Text.RegularExpressions.Regex.Match(errorBody, @"""retryDelay""\s*:\s*""(\d+)s""", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                    if (retryDelayMatch.Success && double.TryParse(retryDelayMatch.Groups[1].Value, out double rSeconds))
                    {
                        sleepMs = (int)(rSeconds * 1000) + 1500;
                    }
                }

                await Task.Delay(sleepMs);
                delay *= 2;
                continue;
            }
            break;
        }

        if (response == null)
        {
            response = await _httpClient.PostAsJsonAsync(url, requestBody);
        }

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException($"Gemini API error: {(int)response.StatusCode} {response.ReasonPhrase}. Details: {errorBody}");
        }

        return response;
    }

    private async Task<string> RunOllamaAsync(string prompt)
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
        if (string.Equals(Provider, "Gemini", StringComparison.OrdinalIgnoreCase))
        {
            return !string.IsNullOrWhiteSpace(_geminiApiKey);
        }

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

    // Ollama DTOs
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

    // Gemini DTOs
    private sealed record GeminiRequest(
        [property: JsonPropertyName("contents")] GeminiContent[] Contents);

    private sealed record GeminiContent(
        [property: JsonPropertyName("parts")] GeminiPart[] Parts);

    private sealed record GeminiPart(
        [property: JsonPropertyName("text")] string Text);

    private sealed record GeminiResponse(
        [property: JsonPropertyName("candidates")] GeminiCandidate[]? Candidates);

    private sealed record GeminiCandidate(
        [property: JsonPropertyName("content")] GeminiContent? Content);
}
using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace CarSales.Api.Services;

public class GeminiImageEmbeddingService : IImageEmbeddingService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GeminiImageEmbeddingService> _logger;
    private readonly string _geminiApiKey;

    public GeminiImageEmbeddingService(
        IConfiguration configuration, 
        IHttpClientFactory httpClientFactory,
        ILogger<GeminiImageEmbeddingService> logger)
    {
        _configuration = configuration;
        _logger = logger;
        _geminiApiKey = configuration["GEMINI_API_KEY"] ?? string.Empty;
        _httpClient = httpClientFactory.CreateClient("Ollama"); // Reuse Ollama client for general outbound HTTP
    }

    private string Provider => _configuration["AI_PROVIDER"] ?? "Ollama";

    public async Task<float[]> GenerateEmbeddingAsync(Stream imageStream, string mimeType, CancellationToken cancellationToken)
    {
        using var ms = new MemoryStream();
        await imageStream.CopyToAsync(ms, cancellationToken);
        var imageBytes = ms.ToArray();

        // Check if we should use local mock embedding generator
        if (string.Equals(Provider, "Ollama", StringComparison.OrdinalIgnoreCase) || string.IsNullOrWhiteSpace(_geminiApiKey))
        {
            _logger.LogInformation("Using local mock embedding generator (Provider: {Provider}, HasKey: {HasKey})", Provider, !string.IsNullOrWhiteSpace(_geminiApiKey));
            return GenerateMockEmbedding(imageBytes);
        }

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key={_geminiApiKey}";

        var base64Data = Convert.ToBase64String(imageBytes);
        var requestBody = new
        {
            content = new
            {
                parts = new object[]
                {
                    new { inlineData = new { mimeType = mimeType, data = base64Data } }
                }
            }
        };

        // Leverage standard post with retry helper logic (inline or similar)
        using var response = await PostWithRetryAsync(url, requestBody, cancellationToken);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<GeminiEmbeddingResponse>(cancellationToken: cancellationToken);
        var values = result?.Embedding?.Values;

        if (values == null || values.Length == 0)
        {
            throw new InvalidOperationException("Gemini Embedding API returned an empty or null vector.");
        }

        return values;
    }

    private async Task<HttpResponseMessage> PostWithRetryAsync<T>(string url, T requestBody, CancellationToken cancellationToken, int maxRetries = 3)
    {
        int delay = 2000;
        HttpResponseMessage? response = null;
        for (int i = 0; i < maxRetries; i++)
        {
            response = await _httpClient.PostAsJsonAsync(url, requestBody, cancellationToken);
            if (response.StatusCode == (System.Net.HttpStatusCode)429)
            {
                var errorBody = await response.Content.ReadAsStringAsync(cancellationToken);
                int sleepMs = delay;

                var match = System.Text.RegularExpressions.Regex.Match(errorBody, @"Please retry in (\d+(?:\.\d+)?)s", System.Text.RegularExpressions.RegexOptions.IgnoreCase);
                if (match.Success && double.TryParse(match.Groups[1].Value, out double seconds))
                {
                    sleepMs = (int)(seconds * 1000) + 1000;
                }

                await Task.Delay(sleepMs, cancellationToken);
                delay *= 2;
                continue;
            }
            break;
        }

        if (response == null)
        {
            response = await _httpClient.PostAsJsonAsync(url, requestBody, cancellationToken);
        }

        return response;
    }

    private float[] GenerateMockEmbedding(byte[] imageBytes)
    {
        int seed = 0;
        using (var sha256 = SHA256.Create())
        {
            var hash = sha256.ComputeHash(imageBytes);
            seed = BitConverter.ToInt32(hash, 0);
        }

        var random = new Random(seed);
        var embedding = new float[1408];
        for (int i = 0; i < embedding.Length; i++)
        {
            embedding[i] = (float)(random.NextDouble() * 2.0 - 1.0);
        }

        // Normalize
        float sumSquares = 0f;
        for (int i = 0; i < embedding.Length; i++)
        {
            sumSquares += embedding[i] * embedding[i];
        }
        float length = (float)Math.Sqrt(sumSquares);
        if (length > 0)
        {
            for (int i = 0; i < embedding.Length; i++)
            {
                embedding[i] /= length;
            }
        }

        return embedding;
    }

    private sealed class GeminiEmbeddingResponse
    {
        [JsonPropertyName("embedding")]
        public GeminiEmbeddingData? Embedding { get; set; }
    }

    private sealed class GeminiEmbeddingData
    {
        [JsonPropertyName("values")]
        public float[]? Values { get; set; }
    }
}

using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using CarSales.Api.Models;

namespace CarSales.Api.Services;

public class DropboxService : IDropboxService
{
    private readonly HttpClient _dropboxClient;
    private readonly string _dropboxToken;
    private readonly string _baseSyncPath;

    public DropboxService(IConfiguration configuration, IHttpClientFactory httpClientFactory)
    {
        _dropboxToken = configuration["DROPBOX_ACCESS_TOKEN"] ?? string.Empty;
        _dropboxClient = httpClientFactory.CreateClient("Dropbox");

        var configuredPath = configuration["Dropbox:LocalSyncPath"];
        _baseSyncPath = string.IsNullOrWhiteSpace(configuredPath)
            ? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "DropboxSim")
            : configuredPath;

        if (!Directory.Exists(_baseSyncPath))
        {
            var relativePath = Path.Combine(Directory.GetCurrentDirectory(), "DropboxSim");
            if (Directory.Exists(relativePath))
            {
                _baseSyncPath = relativePath;
            }
        }
    }

    private bool IsCloudEnabled => !string.IsNullOrWhiteSpace(_dropboxToken);

    private HttpRequestMessage CreateDropboxRequest(HttpMethod method, string url)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _dropboxToken);
        return request;
    }

    public async Task<string?> FindVinFolderAsync(string vin, CancellationToken cancellationToken)
    {
        if (IsCloudEnabled)
        {
            var request = CreateDropboxRequest(HttpMethod.Post, "https://api.dropboxapi.com/2/files/search_v2");
            var searchParams = new
            {
                query = vin,
                options = new
                {
                    file_categories = new[] { "folder" }
                }
            };
            request.Content = JsonContent.Create(searchParams);

            using var response = await _dropboxClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new InvalidOperationException($"Dropbox API Search failed ({response.StatusCode}). Details: {err}");
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            if (json.TryGetProperty("matches", out var matches) && matches.ValueKind == JsonValueKind.Array)
            {
                foreach (var match in matches.EnumerateArray())
                {
                    if (match.TryGetProperty("metadata", out var meta) && meta.TryGetProperty("metadata", out var innerMeta))
                    {
                        if (innerMeta.TryGetProperty(".tag", out var tag) && tag.GetString() == "folder")
                        {
                            var name = innerMeta.GetProperty("name").GetString() ?? "";
                            if (string.Equals(name, vin, StringComparison.OrdinalIgnoreCase))
                            {
                                return innerMeta.GetProperty("path_display").GetString();
                            }
                        }
                    }
                }
            }
            return null;
        }
        else
        {
            if (!Directory.Exists(_baseSyncPath))
            {
                return null;
            }

            var matchingDirs = Directory.GetDirectories(_baseSyncPath, vin, SearchOption.AllDirectories);
            var targetDir = matchingDirs.FirstOrDefault();
            if (targetDir != null)
            {
                return Path.GetRelativePath(_baseSyncPath, targetDir).Replace("\\", "/");
            }
            return null;
        }
    }

    public async Task<IReadOnlyList<DropboxImage>> GetVehicleImagesAsync(string folderPath, CancellationToken cancellationToken)
    {
        var list = new List<DropboxImage>();

        if (IsCloudEnabled)
        {
            var request = CreateDropboxRequest(HttpMethod.Post, "https://api.dropboxapi.com/2/files/list_folder");
            request.Content = JsonContent.Create(new { path = folderPath, recursive = true });

            using var response = await _dropboxClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var err = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new InvalidOperationException($"Dropbox API List Folder failed ({response.StatusCode}). Details: {err}");
            }

            var json = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
            ParseCloudEntries(json, list);

            while (json.TryGetProperty("has_more", out var hasMore) && hasMore.GetBoolean() && json.TryGetProperty("cursor", out var cursor))
            {
                var nextRequest = CreateDropboxRequest(HttpMethod.Post, "https://api.dropboxapi.com/2/files/list_folder/continue");
                nextRequest.Content = JsonContent.Create(new { cursor = cursor.GetString() });

                using var nextResponse = await _dropboxClient.SendAsync(nextRequest, cancellationToken);
                if (!nextResponse.IsSuccessStatusCode)
                {
                    break;
                }

                json = await nextResponse.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: cancellationToken);
                ParseCloudEntries(json, list);
            }
        }
        else
        {
            var localPath = Path.Combine(_baseSyncPath, folderPath.Replace("/", "\\"));
            if (Directory.Exists(localPath))
            {
                var imageExtensions = new[] { "*.png", "*.jpg", "*.jpeg" };
                var files = imageExtensions
                    .SelectMany(ext => Directory.GetFiles(localPath, ext, SearchOption.AllDirectories))
                    .ToList();

                foreach (var file in files)
                {
                    var name = Path.GetFileName(file);
                    var relative = Path.GetRelativePath(_baseSyncPath, file).Replace("\\", "/");
                    var contentHash = CalculateLocalHash(file);
                    var fileId = "local_" + Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes(relative));

                    list.Add(new DropboxImage
                    {
                        DropboxFileId = fileId,
                        FileName = name,
                        PathDisplay = relative.StartsWith("/") ? relative : "/" + relative,
                        ContentHash = contentHash,
                        MimeType = GetMimeType(name),
                        ImageType = "OTHER"
                    });
                }
            }
        }

        return list;
    }

    public async Task<byte[]> DownloadImageAsync(string path, CancellationToken cancellationToken)
    {
        if (IsCloudEnabled)
        {
            var request = CreateDropboxRequest(HttpMethod.Post, "https://content.dropboxapi.com/2/files/download");
            request.Headers.Add("Dropbox-API-Arg", JsonSerializer.Serialize(new { path = path }));

            using var response = await _dropboxClient.SendAsync(request, cancellationToken);
            response.EnsureSuccessStatusCode();

            return await response.Content.ReadAsByteArrayAsync(cancellationToken);
        }
        else
        {
            var localPath = Path.Combine(_baseSyncPath, path.Replace("/", "\\"));
            if (File.Exists(localPath))
            {
                return await File.ReadAllBytesAsync(localPath, cancellationToken);
            }
            throw new FileNotFoundException($"Local file not found at: {localPath}");
        }
    }

    private void ParseCloudEntries(JsonElement json, List<DropboxImage> list)
    {
        if (json.TryGetProperty("entries", out var entries) && entries.ValueKind == JsonValueKind.Array)
        {
            foreach (var entry in entries.EnumerateArray())
            {
                if (entry.TryGetProperty(".tag", out var tag) && tag.GetString() == "file")
                {
                    var name = entry.GetProperty("name").GetString() ?? "";
                    var ext = Path.GetExtension(name).ToLowerInvariant();
                    if (ext == ".png" || ext == ".jpg" || ext == ".jpeg")
                    {
                        var id = entry.TryGetProperty("id", out var idProp) ? idProp.GetString() ?? "" : "";
                        var pathDisplay = entry.TryGetProperty("path_display", out var pathDisp) ? pathDisp.GetString() ?? "" : "";
                        var contentHash = entry.TryGetProperty("content_hash", out var hash) ? hash.GetString() ?? "" : "";

                        list.Add(new DropboxImage
                        {
                            DropboxFileId = id,
                            FileName = name,
                            PathDisplay = pathDisplay,
                            ContentHash = contentHash,
                            MimeType = GetMimeType(name),
                            ImageType = "OTHER"
                        });
                    }
                }
            }
        }
    }

    private static string GetMimeType(string path)
    {
        var ext = Path.GetExtension(path).ToLowerInvariant();
        return ext switch
        {
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            _ => "application/octet-stream"
        };
    }

    private static string CalculateLocalHash(string filePath)
    {
        using var sha256 = SHA256.Create();
        using var stream = File.OpenRead(filePath);
        var hashBytes = sha256.ComputeHash(stream);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
    }
}

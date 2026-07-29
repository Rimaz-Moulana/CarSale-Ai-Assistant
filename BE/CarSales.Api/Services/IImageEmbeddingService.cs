using System.IO;
using System.Threading;
using System.Threading.Tasks;

namespace CarSales.Api.Services;

public interface IImageEmbeddingService
{
    Task<float[]> GenerateEmbeddingAsync(Stream imageStream, string mimeType, CancellationToken cancellationToken);
}

using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using CarSales.Api.Models;

namespace CarSales.Api.Services;

public interface IDropboxService
{
    Task<string?> FindVinFolderAsync(
        string vin,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<DropboxImage>> GetVehicleImagesAsync(
        string folderPath,
        CancellationToken cancellationToken);

    Task<byte[]> DownloadImageAsync(
        string path,
        CancellationToken cancellationToken);
}

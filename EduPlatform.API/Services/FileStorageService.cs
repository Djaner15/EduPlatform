using EduPlatform.API.Services.Interfaces;

namespace EduPlatform.API.Services;

public class FileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _environment;

    public FileStorageService(IWebHostEnvironment environment)
    {
        _environment = environment;
    }

    public async Task<string?> SaveFileAsync(IFormFile? file, string folder, params string[] allowedExtensions)
    {
        if (file == null || file.Length == 0)
        {
            return null;
        }

        var extension = Path.GetExtension(file.FileName);
        if (string.IsNullOrWhiteSpace(extension))
        {
            throw new InvalidOperationException("Uploaded file must have a valid extension.");
        }

        if (allowedExtensions.Length > 0 &&
            !allowedExtensions.Any(item => string.Equals(item, extension, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException($"File type {extension} is not allowed.");
        }

        var root = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var targetFolder = Path.Combine(root, "uploads", folder);
        Directory.CreateDirectory(targetFolder);

        var fileName = $"{Guid.NewGuid():N}{extension.ToLowerInvariant()}";
        var filePath = Path.Combine(targetFolder, fileName);

        await using var stream = File.Create(filePath);
        await file.CopyToAsync(stream);

        return $"/uploads/{folder}/{fileName}";
    }

    public Task DeleteFileIfExistsAsync(string? relativePath)
    {
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return Task.CompletedTask;
        }

        var normalized = relativePath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var root = _environment.WebRootPath;
        if (string.IsNullOrWhiteSpace(root))
        {
            root = Path.Combine(_environment.ContentRootPath, "wwwroot");
        }

        var absolutePath = Path.Combine(root, normalized);
        if (File.Exists(absolutePath))
        {
            File.Delete(absolutePath);
        }

        return Task.CompletedTask;
    }
}

using Microsoft.AspNetCore.Http;

namespace EduPlatform.API.Services.Interfaces;

public interface IFileStorageService
{
    Task<string?> SaveFileAsync(IFormFile? file, string folder, params string[] allowedExtensions);
    Task DeleteFileIfExistsAsync(string? relativePath);
}

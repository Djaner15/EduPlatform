using EduPlatform.API.Models;

namespace EduPlatform.API.Services.Interfaces;

/// <summary>
/// Service for JWT token generation
/// </summary>
public interface ITokenService
{
    /// <summary>
    /// Generates a JWT token for the authenticated user
    /// </summary>
    string GenerateToken(User user);
}

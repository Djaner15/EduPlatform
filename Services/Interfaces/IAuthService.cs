using EduPlatform.API.DTOs.Auth;

namespace EduPlatform.API.Services.Interfaces;

/// <summary>
/// Service for authentication operations
/// </summary>
public interface IAuthService
{
    /// <summary>
    /// Authenticates a user and returns a JWT token
    /// </summary>
    Task<AuthResponseDto> LoginAsync(LoginDto dto);

    /// <summary>
    /// Registers a new user with default Student role and returns JWT token
    /// </summary>
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto);
}

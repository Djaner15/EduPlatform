using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using EduPlatform.API.Services.Interfaces;
using EduPlatform.API.DTOs.Auth;
using EduPlatform.API.Services;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;
    private readonly UserService _userService;

    public AuthController(IAuthService authService, UserService userService)
    {
        _authService = authService;
        _userService = userService;
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto)
    {
        try
        {
            var response = await _authService.LoginAsync(dto);
            return Ok(response);
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(ex.Message);
        }
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto)
    {
        try
        {
            var response = await _authService.RegisterAsync(dto);
            return Created("api/auth/register", response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Gets current authenticated user information from JWT claims
    /// </summary>
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                     ?? User.FindFirst("userId")?.Value;
        
        if (!int.TryParse(userId, out var parsedUserId))
            return Unauthorized("Invalid token claims");

        var user = await _userService.GetByIdAsync(parsedUserId);
        if (user == null)
            return Unauthorized("User not found");

        return Ok(new
        {
            userId = user.Id,
            fullName = user.FullName,
            username = user.Username,
            email = user.Email,
            role = user.Role?.Name ?? "Unknown",
            profileImageUrl = user.ProfileImageUrl,
            grade = user.Grade,
            section = user.Section,
            classDisplay = ClassAssignmentPolicy.FormatClassDisplay(user.Grade, user.Section)
        });
    }

    [Authorize]
    [HttpPost("profile-image")]
    [Consumes("multipart/form-data")]
    public async Task<IActionResult> UploadProfileImage([FromForm] IFormFile image)
    {
        var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("userId")?.Value;

        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized("Invalid token claims");
        }

        if (image == null || image.Length == 0)
        {
            return BadRequest(new { error = "Please choose an image to upload." });
        }

        try
        {
            var user = await _userService.UpdateProfileImageAsync(userId, image);
            return Ok(new { profileImageUrl = user.ProfileImageUrl });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize]
    [HttpDelete("profile-image")]
    public async Task<IActionResult> DeleteProfileImage()
    {
        var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("userId")?.Value;

        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized("Invalid token claims");
        }

        try
        {
            await _userService.RemoveProfileImageAsync(userId);
            return Ok(new { profileImageUrl = (string?)null });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize]
    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto)
    {
        var userIdValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("userId")?.Value;

        if (!int.TryParse(userIdValue, out var userId))
        {
            return Unauthorized("Invalid token claims");
        }

        try
        {
            await _authService.ChangePasswordAsync(userId, dto);
            return Ok(new { message = "Password updated successfully." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}

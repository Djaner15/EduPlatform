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

    public AuthController(IAuthService authService)
    {
        _authService = authService;
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
    public IActionResult GetCurrentUser()
    {
        var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                     ?? User.FindFirst("userId")?.Value;
        var username = User.FindFirst(ClaimTypes.Name)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var parsedGrade = User.FindFirst("grade")?.Value is string gradeValue && int.TryParse(gradeValue, out var grade)
            ? (int?)grade
            : null;
        var section = User.FindFirst("section")?.Value;

        if (string.IsNullOrEmpty(userId) || string.IsNullOrEmpty(username))
            return Unauthorized("Invalid token claims");

        return Ok(new
        {
            userId = int.Parse(userId),
            username = username,
            role = role ?? "Unknown",
            grade = parsedGrade,
            section,
            classDisplay = ClassAssignmentPolicy.FormatClassDisplay(parsedGrade, section)
        });
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

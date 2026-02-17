using BCrypt.Net;
using EduPlatform.API.Data;
using EduPlatform.API.Models;
using EduPlatform.API.DTOs.Auth;
using EduPlatform.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.API.Services;

public class AuthService : IAuthService
{
    private readonly AppDbContext _context;
    private readonly ITokenService _tokenService;

    public AuthService(AppDbContext context, ITokenService tokenService)
    {
        _context = context;
        _tokenService = tokenService;
    }

    /// <summary>
    /// Authenticates a user and returns a JWT token response
    /// </summary>
    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Username == dto.Username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            throw new UnauthorizedAccessException("Invalid credentials");

        var token = _tokenService.GenerateToken(user);

        return new AuthResponseDto
        {
            Token = token,
            Username = user.Username,
            Role = user.Role!.Name,
            UserId = user.Id
        };
    }

    /// <summary>
    /// Registers a new user with default Student role and returns JWT token
    /// </summary>
    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        // Validate username not empty
        if (string.IsNullOrWhiteSpace(dto.Username))
            throw new InvalidOperationException("Username is required");

        // Validate email not empty
        if (string.IsNullOrWhiteSpace(dto.Email))
            throw new InvalidOperationException("Email is required");

        // Validate password not empty
        if (string.IsNullOrWhiteSpace(dto.Password))
            throw new InvalidOperationException("Password is required");

        // Check username uniqueness
        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            throw new InvalidOperationException("Username already exists");

        // Check email uniqueness
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            throw new InvalidOperationException("Email already exists");

        // Default role is Student (RoleId = 1)
        const int studentRoleId = 1;

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RoleId = studentRoleId
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        // Reload user with role information
        await _context.Entry(user).Reference(u => u.Role).LoadAsync();

        // Generate JWT token
        var token = _tokenService.GenerateToken(user);

        return new AuthResponseDto
        {
            Token = token,
            Username = user.Username,
            Role = user.Role!.Name,
            UserId = user.Id
        };
    }
}

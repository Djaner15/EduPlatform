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
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public AuthService(
        AppDbContext context,
        ITokenService tokenService,
        IEmailService emailService,
        IConfiguration configuration)
    {
        _context = context;
        _tokenService = tokenService;
        _emailService = emailService;
        _configuration = configuration;
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

        if (user.Role?.Name != "Admin" && !user.IsApproved)
            throw new UnauthorizedAccessException("Your account is not currently approved for access.");

        var token = _tokenService.GenerateToken(user);

        return new AuthResponseDto
        {
            Token = token,
            FullName = user.FullName,
            Username = user.Username,
            Role = user.Role!.Name,
            UserId = user.Id,
            Grade = user.Grade,
            Section = user.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(user.Grade, user.Section)
        };
    }

    /// <summary>
    /// Registers a new user with default Student role and returns JWT token
    /// </summary>
    public async Task<RegisterResponseDto> RegisterAsync(RegisterDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName))
            throw new InvalidOperationException("Full name is required");

        // Validate username not empty
        if (string.IsNullOrWhiteSpace(dto.Username))
            throw new InvalidOperationException("Username is required");

        // Validate email not empty
        if (string.IsNullOrWhiteSpace(dto.Email))
            throw new InvalidOperationException("Email is required");

        var normalizedEmail = EmailAddressPolicy.Normalize(dto.Email);

        if (EmailAddressPolicy.IsReservedPlatformEmail(_configuration, normalizedEmail))
            throw new InvalidOperationException("This email address is reserved for platform communication and cannot be used for registration.");

        PasswordPolicy.EnsureValid(dto.Password);

        var studentClass = ClassAssignmentPolicy.EnsureValidClass(dto.Grade, dto.Section);

        // Check username uniqueness
        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            throw new InvalidOperationException("Username already exists");

        // Check email uniqueness
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
            throw new InvalidOperationException("Email already exists");

        // Default role is Student (RoleId = 1)
        const int studentRoleId = 1;

        var user = new User
        {
            FullName = dto.FullName.Trim(),
            Username = dto.Username,
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RoleId = studentRoleId,
            Grade = studentClass.Grade,
            Section = studentClass.Section,
            IsApproved = false
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await _emailService.SendRegistrationReceivedAsync(user.Email, user.Username);

        return new RegisterResponseDto
        {
            Message = "Registration submitted successfully. An administrator must approve your account before you can log in.",
            RequiresApproval = true
        };
    }

    public async Task ChangePasswordAsync(int userId, ChangePasswordDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.CurrentPassword))
        {
            throw new InvalidOperationException("Current password is required.");
        }

        PasswordPolicy.EnsureValid(dto.NewPassword);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null)
        {
            throw new InvalidOperationException("User not found.");
        }

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
        {
            throw new UnauthorizedAccessException("Current password is incorrect.");
        }

        if (BCrypt.Net.BCrypt.Verify(dto.NewPassword, user.PasswordHash))
        {
            throw new InvalidOperationException("New password must be different from the current password.");
        }

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();
    }
}

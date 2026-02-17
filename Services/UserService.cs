using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using EduPlatform.API.Data;
using EduPlatform.API.Models;

namespace EduPlatform.API.Services;

public class UserService
{
    private readonly AppDbContext _context;

    public UserService(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Gets all users with their role information
    /// </summary>
    public async Task<List<User>> GetAllAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .ToListAsync();
    }

    /// <summary>
    /// Gets a user by ID with role information
    /// </summary>
    public async Task<User?> GetByIdAsync(int id)
    {
        return await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    /// <summary>
    /// Creates a new user with validation
    /// </summary>
    public async Task<User> CreateAsync(string username, string email, string password, int roleId)
    {
        // Validate username uniqueness
        if (await _context.Users.AnyAsync(u => u.Username == username))
            throw new InvalidOperationException("Username already exists");

        // Validate email uniqueness
        if (await _context.Users.AnyAsync(u => u.Email == email))
            throw new InvalidOperationException("User with this email already exists");

        // Validate role exists
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == roleId);
        if (role == null)
            throw new InvalidOperationException("Role does not exist");

        // Prevent admin creation via this method
        if (role.Name == "Admin")
            throw new InvalidOperationException("Cannot create admin users");

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            RoleId = roleId
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
        return user;
    }

    /// <summary>
    /// Updates a user with validation
    /// </summary>
    public async Task<User> UpdateAsync(int id, string username, string email, int roleId, string? password = null)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            throw new InvalidOperationException("User not found");

        // Validate username uniqueness
        if (await _context.Users.AnyAsync(u => u.Username == username && u.Id != id))
            throw new InvalidOperationException("Username already exists");

        // Validate email uniqueness
        if (await _context.Users.AnyAsync(u => u.Email == email && u.Id != id))
            throw new InvalidOperationException("Email already exists");

        // Validate role
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == roleId);
        if (role == null)
            throw new InvalidOperationException("Invalid role");

        user.Username = username;
        user.Email = email;
        user.RoleId = roleId;

        if (!string.IsNullOrWhiteSpace(password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);

        await _context.SaveChangesAsync();
        return user;
    }

    /// <summary>
    /// Deletes a user by ID
    /// </summary>
    public async Task DeleteAsync(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            throw new InvalidOperationException("User not found");

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();
    }
}
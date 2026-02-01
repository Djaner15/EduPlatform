using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using EduPlatform.API.Data;
using EduPlatform.API.Models;
using EduPlatform.API.DTOs.Auth;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")] // Само Admin може да използва този controller
public class UsersController : ControllerBase
{
    private readonly AppDbContext _context;

    public UsersController(AppDbContext context)
    {
        _context = context;
    }

    // GET: api/users
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _context.Users
            .Include(u => u.Role)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                Role = u.Role!.Name
            })
            .ToListAsync();

        return Ok(users);
    }

    // GET: api/users/1
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .Where(u => u.Id == id)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.Email,
                Role = u.Role!.Name
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound();

        return Ok(user);
    }

    // POST: api/users
    [HttpPost]
    public async Task<IActionResult> CreateUser(CreateUserDto dto)
    {
        // 1. Проверка за дублиран username
        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            return BadRequest("Потребител с това username вече съществува.");

        // 2. Проверка за дублиран email
        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            return BadRequest("Потребител с този email вече съществува.");

        // 3. Взимаме ролята от базата
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == dto.RoleId);

        if (role == null)
            return BadRequest("Несъществуваща роля.");

        // 4. Желязна забрана за Admin
        if (role.Name == "Admin")
            return BadRequest("Admin не може да създава друг Admin.");

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            RoleId = role.Id
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return CreatedAtAction(nameof(GetUser), new { id = user.Id }, new
        {
            user.Id,
            user.Username,
            user.Email,
            Role = role.Name
        });
    }

    // PUT: api/users/1
   [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, UpdateUserDto dto)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        // ❗ Проверка за username
        var usernameExists = await _context.Users
            .AnyAsync(u => u.Username == dto.Username && u.Id != id);

        if (usernameExists)
            return BadRequest("Вече съществува потребител с това username.");

        // ❗ Проверка за email
        var emailExists = await _context.Users
            .AnyAsync(u => u.Email == dto.Email && u.Id != id);

        if (emailExists)
            return BadRequest("Вече съществува потребител с този email.");

        // валидна роля
        if (dto.RoleId != 1 && dto.RoleId != 2)
            return BadRequest("Невалидна роля.");

        user.Username = dto.Username;
        user.Email = dto.Email;

        if (!string.IsNullOrWhiteSpace(dto.Password))
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        user.RoleId = dto.RoleId;

        await _context.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/users/1
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound();

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return NoContent();
    }
}

// DTOs за създаване и update на потребител
public class CreateUserDto
{
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public int RoleId { get; set; } // 1 = Student, 2 = Teacher
}

public class UpdateUserDto
{
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Password { get; set; } // ако не се подаде, не се променя
    public int RoleId { get; set; }
}
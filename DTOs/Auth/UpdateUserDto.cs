namespace EduPlatform.API.DTOs.Auth;

public class UpdateUserDto
{
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Password { get; set; } // ако не се подаде, не се променя
    public int RoleId { get; set; }
}

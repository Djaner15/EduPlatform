namespace EduPlatform.API.DTOs.Auth;

public class AuthResponseDto
{
    public string Token { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Role { get; set; } = null!;
    public int UserId { get; set; }
    public int? Grade { get; set; }
    public string? Section { get; set; }
    public string? ClassDisplay { get; set; }
}

namespace EduPlatform.API.DTOs.Auth;

public class CreateUserDto
{
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public int RoleId { get; set; } // 1 = Student, 2 = Teacher
}

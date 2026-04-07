namespace EduPlatform.API.DTOs.Auth;

public class CreateUserDto
{
    public string FullName { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public int RoleId { get; set; }
    public int? Grade { get; set; }
    public string? Section { get; set; }
    public List<int>? SubjectIds { get; set; }
    public List<AssignedClassDto>? AssignedClasses { get; set; }
}

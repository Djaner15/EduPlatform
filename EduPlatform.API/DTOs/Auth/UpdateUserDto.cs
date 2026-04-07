namespace EduPlatform.API.DTOs.Auth;

public class UpdateUserDto
{
    public string FullName { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string? Password { get; set; } // ако не се подаде, не се променя
    public int RoleId { get; set; }
    public int? Grade { get; set; }
    public string? Section { get; set; }
    public List<int>? SubjectIds { get; set; }
    public List<AssignedClassDto>? AssignedClasses { get; set; }
}

public class AssignedClassDto
{
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
}

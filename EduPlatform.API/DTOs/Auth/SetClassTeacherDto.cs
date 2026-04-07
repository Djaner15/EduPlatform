namespace EduPlatform.API.DTOs.Auth;

public class SetClassTeacherDto
{
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
    public int? TeacherId { get; set; }
}

namespace EduPlatform.API.Models;

public class TeacherSubjectAssignment
{
    public int TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public int SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;
}

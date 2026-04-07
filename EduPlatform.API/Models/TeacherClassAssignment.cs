namespace EduPlatform.API.Models;

public class TeacherClassAssignment
{
    public int TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public int ClassSectionId { get; set; }
    public ClassSection ClassSection { get; set; } = null!;
}

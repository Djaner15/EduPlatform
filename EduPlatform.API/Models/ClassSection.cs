namespace EduPlatform.API.Models;

public class ClassSection
{
    public int Id { get; set; }
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
    public int? ClassTeacherId { get; set; }
    public User? ClassTeacher { get; set; }
    public ICollection<TeacherClassAssignment> TeacherAssignments { get; set; } = new List<TeacherClassAssignment>();
}

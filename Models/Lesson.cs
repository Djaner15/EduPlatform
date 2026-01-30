namespace EduPlatform.API.Models;

public class Lesson
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int SubjectId { get; set; }
    public Subject Subject { get; set; } = null!;
    public int GradeId { get; set; }
    public Grade Grade { get; set; } = null!;
    public ICollection<Test> Tests { get; set; } = new List<Test>();
}
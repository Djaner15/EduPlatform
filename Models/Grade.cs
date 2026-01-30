namespace EduPlatform.API.Models;

public class Grade
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public ICollection<Lesson> Lessons { get; set; } = new List<Lesson>();
}

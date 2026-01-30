namespace EduPlatform.API.Models;

public class Test
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public int LessonId { get; set; }
    public Lesson Lesson { get; set; } = null!;
    public ICollection<Question> Questions { get; set; } = new List<Question>();
}   
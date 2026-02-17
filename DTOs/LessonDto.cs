namespace EduPlatform.API.DTOs;

public class LessonDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public int GradeId { get; set; }
}

public class CreateLessonDto
{
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int SubjectId { get; set; }
    public int GradeId { get; set; }
}

public class UpdateLessonDto
{
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public int SubjectId { get; set; }
    public int GradeId { get; set; }
}

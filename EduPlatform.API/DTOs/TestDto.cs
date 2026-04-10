using Microsoft.AspNetCore.Http;

namespace EduPlatform.API.DTOs;

public class AnswerDto
{
    public int Id { get; set; }
    public string Text { get; set; } = null!;
    public bool IsCorrect { get; set; }
    public int OrderIndex { get; set; }
}

public class AnswerUpsertDto
{
    public string Text { get; set; } = null!;
    public bool IsCorrect { get; set; }
}

public class QuestionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = null!;
    public string Type { get; set; } = "multiple-choice";
    public string? ImageUrl { get; set; }
    public string? CorrectTextAnswer { get; set; }
    public int OrderIndex { get; set; }
    public ICollection<AnswerDto> Answers { get; set; } = new List<AnswerDto>();
}

public class QuestionUpsertDto
{
    public string ClientKey { get; set; } = Guid.NewGuid().ToString("N");
    public string Text { get; set; } = null!;
    public string Type { get; set; } = "multiple-choice";
    public string? CorrectTextAnswer { get; set; }
    public string? ImageKey { get; set; }
    public ICollection<AnswerUpsertDto> Answers { get; set; } = new List<AnswerUpsertDto>();
}

public class TestDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public int LessonId { get; set; }
    public string LessonTitle { get; set; } = null!;
    public string SubjectName { get; set; } = null!;
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
    public string ClassDisplay { get; set; } = null!;
    public int CreatedByUserId { get; set; }
    public string? CreatedByUsername { get; set; }
    public string? CreatedByFullName { get; set; }
    public bool CreatedByIsApproved { get; set; }
    public ICollection<QuestionDto> Questions { get; set; } = new List<QuestionDto>();
}

public class TestUpsertDto
{
    public string Title { get; set; } = null!;
    public int LessonId { get; set; }
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
    public ICollection<QuestionUpsertDto> Questions { get; set; } = new List<QuestionUpsertDto>();
}

public class TestUpsertFormDto
{
    public string Payload { get; set; } = "{}";
    public List<IFormFile> Files { get; set; } = new();
}

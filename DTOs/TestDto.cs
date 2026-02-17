namespace EduPlatform.API.DTOs;

public class AnswerDto
{
    public int Id { get; set; }
    public string Text { get; set; } = null!;
    public bool IsCorrect { get; set; }
}

public class CreateAnswerDto
{
    public string Text { get; set; } = null!;
    public bool IsCorrect { get; set; }
}

public class QuestionDto
{
    public int Id { get; set; }
    public string Text { get; set; } = null!;
    public ICollection<AnswerDto> Answers { get; set; } = new List<AnswerDto>();
}

public class CreateQuestionDto
{
    public string Text { get; set; } = null!;
    public ICollection<CreateAnswerDto> Answers { get; set; } = new List<CreateAnswerDto>();
}

public class TestDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public int LessonId { get; set; }
    public ICollection<QuestionDto> Questions { get; set; } = new List<QuestionDto>();
}

public class CreateTestDto
{
    public string Title { get; set; } = null!;
    public int LessonId { get; set; }
}

public class CreateTestWithQuestionsDto
{
    public ICollection<CreateQuestionDto> Questions { get; set; } = new List<CreateQuestionDto>();
}

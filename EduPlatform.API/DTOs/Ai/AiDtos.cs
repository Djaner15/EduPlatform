namespace EduPlatform.API.DTOs.Ai;

public class AiGenerateTestRequestDto
{
    public string Topic { get; set; } = string.Empty;
    public string Difficulty { get; set; } = "medium";
    public int QuestionCount { get; set; } = 5;
}

public class AiGeneratedAnswerDto
{
    public string Text { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
}

public class AiGeneratedQuestionDto
{
    public string Text { get; set; } = string.Empty;
    public ICollection<AiGeneratedAnswerDto> Answers { get; set; } = new List<AiGeneratedAnswerDto>();
}

public class AiGenerateTestResponseDto
{
    public string Title { get; set; } = string.Empty;
    public ICollection<AiGeneratedQuestionDto> Questions { get; set; } = new List<AiGeneratedQuestionDto>();
}

public class AiExplainRequestDto
{
    public int TestId { get; set; }
    public int QuestionId { get; set; }
    public int? SelectedAnswerId { get; set; }
    public string? TextAnswer { get; set; }
}

public class AiExplainResponseDto
{
    public string Explanation { get; set; } = string.Empty;
}

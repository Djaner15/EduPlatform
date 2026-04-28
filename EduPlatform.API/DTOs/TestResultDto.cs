namespace EduPlatform.API.DTOs;

public class SubmitAnswerDto
{
    public int QuestionId { get; set; }
    public int? AnswerId { get; set; }
    public string? TextAnswer { get; set; }
}

public class SubmitTestDto
{
    public ICollection<SubmitAnswerDto> Answers { get; set; } = new List<SubmitAnswerDto>();
}

public class TestResultDto
{
    public int ResultId { get; set; }
    public int TestId { get; set; }
    public int UserId { get; set; }
    public string TestTitle { get; set; } = null!;
    public string SubjectName { get; set; } = null!;
    public int ScorePercentage { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class TestResultQuestionReviewDto
{
    public int QuestionId { get; set; }
    public int OrderIndex { get; set; }
    public string QuestionText { get; set; } = null!;
    public string QuestionType { get; set; } = null!;
    public string? StudentAnswerText { get; set; }
    public string CorrectAnswerText { get; set; } = null!;
    public bool IsCorrect { get; set; }
    public string? Explanation { get; set; }
}

public class TestResultDetailsDto
{
    public int ResultId { get; set; }
    public int TestId { get; set; }
    public string TestTitle { get; set; } = null!;
    public string SubjectName { get; set; } = null!;
    public int ScorePercentage { get; set; }
    public DateTime CompletedAt { get; set; }
    public bool HasStoredReview { get; set; }
    public List<TestResultQuestionReviewDto> Questions { get; set; } = new();
}

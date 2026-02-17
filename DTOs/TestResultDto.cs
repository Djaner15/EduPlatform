namespace EduPlatform.API.DTOs;

public class SubmitAnswerDto
{
    public int QuestionId { get; set; }
    public int AnswerId { get; set; }
}

public class SubmitTestDto
{
    public ICollection<SubmitAnswerDto> Answers { get; set; } = new List<SubmitAnswerDto>();
}

public class TestResultDto
{
    public int TestId { get; set; }
    public int UserId { get; set; }
    public int ScorePercentage { get; set; }
    public DateTime CompletedAt { get; set; }
}

namespace EduPlatform.API.Models
{
    public class TestResultAnswer
    {
        public int Id { get; set; }
        public int TestResultId { get; set; }
        public TestResult TestResult { get; set; } = null!;
        public int QuestionId { get; set; }
        public int OrderIndex { get; set; }
        public string QuestionText { get; set; } = null!;
        public string QuestionType { get; set; } = null!;
        public int? SelectedAnswerId { get; set; }
        public string? StudentAnswerText { get; set; }
        public string CorrectAnswerText { get; set; } = null!;
        public bool IsCorrect { get; set; }
        public string? Explanation { get; set; }
    }
}

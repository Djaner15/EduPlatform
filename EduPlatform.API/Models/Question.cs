namespace EduPlatform.API.Models
{
    public class Question
    {
        public int Id { get; set; }
        public string Text { get; set; } = null!;
        public string Type { get; set; } = "multiple-choice";
        public string? ImageUrl { get; set; }
        public string? CorrectTextAnswer { get; set; }
        public int OrderIndex { get; set; }
        public int TestId { get; set; }
        public Test Test { get; set; } = null!;
        public ICollection<Answer> Answers { get; set; } = new List<Answer>();
    }
}

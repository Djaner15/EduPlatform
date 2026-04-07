namespace EduPlatform.API.Models
{
    public class TestResult
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; } = null!;
        public int TestId { get; set; }
        public Test Test { get; set; } = null!;
        public int Score { get; set; }
        public DateTime CompletedAt { get; set; } = DateTime.UtcNow;
    }
}

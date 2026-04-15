namespace EduPlatform.API.DTOs;

public class StudentDashboardStatsDto
{
    public int CompletedTests { get; set; }
    public double AverageScore { get; set; }
    public string LastTest { get; set; } = "0";
}

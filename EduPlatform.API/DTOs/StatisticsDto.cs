namespace EduPlatform.API.DTOs;

public class StatisticsDto
{
    public int TotalUsers { get; set; }
    public int TotalTests { get; set; }
    public int TotalResults { get; set; }
    public double AverageScore { get; set; }
}

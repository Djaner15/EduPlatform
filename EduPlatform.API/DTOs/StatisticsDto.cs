namespace EduPlatform.API.DTOs;

public class StatisticsDto
{
    public int TotalUsers { get; set; }
    public int TotalTests { get; set; }
    public int TotalResults { get; set; }
    public double AverageScore { get; set; }
    public double AverageScoreTrend { get; set; }
    public int RegisteredStudents { get; set; }
    public int PendingTeacherApprovals { get; set; }
    public long StorageUsedBytes { get; set; }
    public List<ActivityPointDto> Activity { get; set; } = new();
    public List<SubjectDistributionDto> SubjectDistribution { get; set; } = new();
    public List<RecentActivityDto> RecentActivity { get; set; } = new();
}

public class ActivityPointDto
{
    public string Label { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public int Actions { get; set; }
}

public class SubjectDistributionDto
{
    public string SubjectName { get; set; } = string.Empty;
    public int LessonCount { get; set; }
}

public class RecentActivityDto
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime OccurredAt { get; set; }
}

public class RecentActivityPageDto
{
    public List<RecentActivityDto> Items { get; set; } = new();
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalCount { get; set; }
    public int TotalPages { get; set; }
}

public class TeacherOverviewStatsDto
{
    public int SubjectCount { get; set; }
    public int LessonCount { get; set; }
    public int TestCount { get; set; }
    public int StudentEngagementCount { get; set; }
    public double AverageTestPerformance { get; set; }
    public List<TeacherSubjectSnapshotDto> Subjects { get; set; } = new();
}

public class TeacherSubjectSnapshotDto
{
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string ClassDisplay { get; set; } = string.Empty;
    public int LessonCount { get; set; }
    public int TestCount { get; set; }
}

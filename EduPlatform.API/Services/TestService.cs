using EduPlatform.API.Data;
using EduPlatform.API.DTOs;
using EduPlatform.API.Models;
using EduPlatform.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting;

namespace EduPlatform.API.Services;

public class TestService : ITestService
{
    private readonly AppDbContext _context;
    private readonly IFileStorageService _fileStorageService;
    private readonly IWebHostEnvironment _environment;

    public TestService(AppDbContext context, IFileStorageService fileStorageService, IWebHostEnvironment environment)
    {
        _context = context;
        _fileStorageService = fileStorageService;
        _environment = environment;
    }


    public async Task<List<TestDto>> GetAllAsync(int currentUserId, string currentRole, bool ignoreClassFilter = false)
    {
        var query = _context.Tests
            .Include(t => t.Lesson).ThenInclude(l => l.Subject)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Questions).ThenInclude(q => q.Answers)
            .AsQueryable();

        if (string.Equals(currentRole, "Teacher", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(t => t.CreatedByUserId == currentUserId);
        }
        else if (!ignoreClassFilter &&
                 string.Equals(currentRole, "Student", StringComparison.OrdinalIgnoreCase) &&
                 currentUserId > 0)
        {
            var student = await _context.Users.FindAsync(currentUserId)
                ?? throw new InvalidOperationException("Student account not found.");

            if (!student.Grade.HasValue)
            {
                throw new InvalidOperationException("Student grade assignment is missing.");
            }

            query = query.Where(t => t.Grade >= 8 && t.Grade <= student.Grade.Value);
        }

        return await query.Select(t => new TestDto
            {
                Id = t.Id,
                Title = t.Title,
                CreatedAt = t.CreatedAt,
                LessonId = t.LessonId,
                LessonTitle = t.Lesson.Title,
                SubjectName = t.Lesson.Subject.Name,
                Grade = t.Grade,
                Section = t.Section,
                ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(t.Grade, t.Section) ?? string.Empty,
                CreatedByUserId = t.CreatedByUserId,
                CreatedByUsername = t.CreatedByUser.Username,
                CreatedByFullName = t.CreatedByUser.FullName,
                CreatedByIsApproved = t.CreatedByUser.IsApproved,
                Questions = t.Questions.Select(q => new QuestionDto
                {
                    Id = q.Id,
                    Text = q.Text,
                    Type = q.Type,
                    ImageUrl = q.ImageUrl,
                    CorrectTextAnswer = q.CorrectTextAnswer,
                    OrderIndex = q.OrderIndex,
                    Answers = q.Answers.OrderBy(a => a.OrderIndex).Select(a => new AnswerDto
                    {
                        Id = a.Id,
                        Text = a.Text,
                        IsCorrect = a.IsCorrect,
                        OrderIndex = a.OrderIndex
                    }).ToList()
                }).OrderBy(q => q.OrderIndex).ToList()
            })
            .ToListAsync();
    }

    public async Task<TestDto?> GetByIdAsync(int id, int currentUserId, string currentRole)
    {
        var test = await _context.Tests
            .Include(t => t.Lesson).ThenInclude(l => l.Subject)
            .Include(t => t.CreatedByUser)
            .Include(t => t.Questions).ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (test == null)
            return null;

        if (string.Equals(currentRole, "Teacher", StringComparison.OrdinalIgnoreCase) &&
            test.CreatedByUserId != currentUserId)
        {
            return null;
        }
        else if (string.Equals(currentRole, "Student", StringComparison.OrdinalIgnoreCase) && currentUserId > 0)
        {
            var student = await _context.Users.FindAsync(currentUserId);
            if (student == null || !ClassAssignmentPolicy.CanAccessStudentContent(student, test.Grade))
            {
                return null;
            }
        }

        return new TestDto
        {
            Id = test.Id,
            Title = test.Title,
            CreatedAt = test.CreatedAt,
            LessonId = test.LessonId,
            LessonTitle = test.Lesson.Title,
            SubjectName = test.Lesson.Subject.Name,
            Grade = test.Grade,
            Section = test.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(test.Grade, test.Section) ?? string.Empty,
            CreatedByUserId = test.CreatedByUserId,
            CreatedByUsername = test.CreatedByUser.Username,
            CreatedByFullName = test.CreatedByUser.FullName,
            CreatedByIsApproved = test.CreatedByUser.IsApproved,
            Questions = test.Questions.Select(q => new QuestionDto
            {
                Id = q.Id,
                Text = q.Text,
                Type = q.Type,
                ImageUrl = q.ImageUrl,
                CorrectTextAnswer = q.CorrectTextAnswer,
                OrderIndex = q.OrderIndex,
                Answers = q.Answers.OrderBy(a => a.OrderIndex).Select(a => new AnswerDto
                {
                    Id = a.Id,
                    Text = a.Text,
                    IsCorrect = a.IsCorrect,
                    OrderIndex = a.OrderIndex
                }).ToList()
            }).OrderBy(q => q.OrderIndex).ToList()
        };
    }

    public async Task<TestDto> CreateAsync(TestUpsertDto dto, IReadOnlyCollection<IFormFile> files, int currentUserId)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Test title is required.");

        var lesson = await _context.Lessons
            .Include(l => l.Subject)
            .FirstOrDefaultAsync(l => l.Id == dto.LessonId);
        if (lesson == null)
            throw new InvalidOperationException("Lesson not found.");

        var classAssignment = ClassAssignmentPolicy.EnsureValidClass(dto.Grade, dto.Section);

        if (lesson.Grade != classAssignment.Grade || lesson.Section != classAssignment.Section)
            throw new InvalidOperationException("Test class must match the selected lesson class.");

        var test = new Test
        {
            Title = dto.Title.Trim(),
            CreatedAt = DateTime.UtcNow,
            LessonId = dto.LessonId,
            Grade = classAssignment.Grade,
            Section = classAssignment.Section,
            CreatedByUserId = currentUserId
        };

        _context.Tests.Add(test);
        await _context.SaveChangesAsync();
        await ReplaceQuestionsAsync(test, dto, files);

        return await GetByIdAsync(test.Id, currentUserId, "Teacher") ?? throw new InvalidOperationException("Failed to load created test.");
    }

    public async Task<TestDto> UpdateAsync(int id, TestUpsertDto dto, IReadOnlyCollection<IFormFile> files, int currentUserId, string currentRole)
    {
        var test = await _context.Tests
            .Include(t => t.Questions).ThenInclude(q => q.Answers)
            .Include(t => t.Lesson).ThenInclude(l => l.Subject)
            .Include(t => t.CreatedByUser)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (test == null)
            throw new KeyNotFoundException("Test not found.");

        EnsureCanManage(test.CreatedByUserId, currentUserId, currentRole);

        var lesson = await _context.Lessons
            .Include(l => l.Subject)
            .FirstOrDefaultAsync(l => l.Id == dto.LessonId);

        if (lesson == null)
            throw new InvalidOperationException("Lesson not found.");

        var classAssignment = ClassAssignmentPolicy.EnsureValidClass(dto.Grade, dto.Section);

        if (lesson.Grade != classAssignment.Grade || lesson.Section != classAssignment.Section)
            throw new InvalidOperationException("Test class must match the selected lesson class.");

        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Test title is required.");

        test.Title = dto.Title.Trim();
        test.LessonId = dto.LessonId;
        test.Lesson = lesson;
        test.Grade = classAssignment.Grade;
        test.Section = classAssignment.Section;

        foreach (var question in test.Questions)
        {
            await _fileStorageService.DeleteFileIfExistsAsync(question.ImageUrl);
        }

        _context.Answers.RemoveRange(test.Questions.SelectMany(q => q.Answers));
        _context.Questions.RemoveRange(test.Questions);
        await _context.SaveChangesAsync();

        await ReplaceQuestionsAsync(test, dto, files);

        return await GetByIdAsync(test.Id, currentUserId, currentRole) ?? throw new InvalidOperationException("Failed to load updated test.");
    }

    public async Task DeleteAsync(int id, int currentUserId, string currentRole)
    {
        var test = await _context.Tests.FindAsync(id);

        if (test == null)
            throw new KeyNotFoundException("Test not found");

        EnsureCanManage(test.CreatedByUserId, currentUserId, currentRole);

        var questionImages = await _context.Questions
            .Where(q => q.TestId == id && q.ImageUrl != null)
            .Select(q => q.ImageUrl)
            .ToListAsync();

        foreach (var imageUrl in questionImages)
        {
            await _fileStorageService.DeleteFileIfExistsAsync(imageUrl);
        }

        _context.Tests.Remove(test);
        await _context.SaveChangesAsync();
    }

    /// <summary>
    /// Submits a test, calculates score, persists TestResult and returns TestResultDto
    /// </summary>
    public async Task<TestResultDto> SubmitTestAsync(int testId, int userId, SubmitTestDto dto)
    {
        var test = await _context.Tests
            .Include(t => t.Lesson).ThenInclude(l => l.Subject)
            .Include(t => t.Questions).ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(t => t.Id == testId);

        if (test == null)
            throw new KeyNotFoundException("Test not found");

        var student = await _context.Users.FindAsync(userId)
            ?? throw new InvalidOperationException("Student account not found.");

        if (!ClassAssignmentPolicy.CanAccessStudentContent(student, test.Grade))
            throw new InvalidOperationException("This test is not assigned to your class.");

        var questions = test.Questions.ToList();
        if (!questions.Any())
            throw new InvalidOperationException("Test has no questions");

        // Map answers by question
        var answerMap = dto.Answers?.ToDictionary(a => a.QuestionId) ?? new Dictionary<int, SubmitAnswerDto>();

        int total = questions.Count;
        int correct = 0;
        var reviewItems = new List<TestResultAnswer>();

        foreach (var q in questions)
        {
            answerMap.TryGetValue(q.Id, out var submittedAnswer);

            var correctAnswerText = string.Equals(q.Type, "text", StringComparison.OrdinalIgnoreCase)
                ? q.CorrectTextAnswer?.Trim() ?? string.Empty
                : q.Answers.FirstOrDefault(a => a.IsCorrect)?.Text ?? string.Empty;

            bool isCorrect = false;
            string? studentAnswerText = null;
            string? explanation = null;

            if (string.Equals(q.Type, "text", StringComparison.OrdinalIgnoreCase))
            {
                var expected = q.CorrectTextAnswer?.Trim();
                var actual = submittedAnswer?.TextAnswer?.Trim();
                studentAnswerText = actual;

                if (!string.IsNullOrWhiteSpace(expected) &&
                    !string.IsNullOrWhiteSpace(actual) &&
                    string.Equals(expected, actual, StringComparison.OrdinalIgnoreCase))
                {
                    isCorrect = true;
                }
                else
                {
                    explanation = string.IsNullOrWhiteSpace(expected)
                        ? "No expected answer was configured for this question."
                        : $"Expected answer: {expected}";
                }
            }
            else
            {
                var answer = q.Answers.FirstOrDefault(a => a.Id == submittedAnswer?.AnswerId);
                studentAnswerText = answer?.Text;

                if (answer != null && answer.IsCorrect)
                {
                    isCorrect = true;
                }
                else
                {
                    explanation = string.IsNullOrWhiteSpace(correctAnswerText)
                        ? "No correct answer was configured for this question."
                        : $"Correct answer: {correctAnswerText}";
                }
            }

            if (isCorrect)
            {
                correct++;
            }

            reviewItems.Add(new TestResultAnswer
            {
                QuestionId = q.Id,
                OrderIndex = q.OrderIndex,
                QuestionText = q.Text,
                QuestionType = q.Type,
                SelectedAnswerId = submittedAnswer?.AnswerId,
                StudentAnswerText = studentAnswerText,
                CorrectAnswerText = correctAnswerText,
                IsCorrect = isCorrect,
                Explanation = explanation
            });
        }

        int percentage = total == 0 ? 0 : (int)Math.Round((double)correct / total * 100);

        var result = new TestResult
        {
            UserId = userId,
            TestId = testId,
            Score = percentage,
            CompletedAt = DateTime.UtcNow
        };

        _context.TestResults.Add(result);
        foreach (var reviewItem in reviewItems)
        {
            result.SubmittedAnswers.Add(reviewItem);
        }
        await _context.SaveChangesAsync();

        return new TestResultDto
        {
            ResultId = result.Id,
            TestId = testId,
            UserId = userId,
            TestTitle = test.Title,
            SubjectName = test.Lesson.Subject.Name,
            ScorePercentage = percentage,
            CompletedAt = result.CompletedAt
        };
    }

    public async Task<List<TestResultDto>> GetAllResultsAsync()
    {
        return await _context.TestResults
            .Include(tr => tr.Test).ThenInclude(t => t.Lesson).ThenInclude(l => l.Subject)
            .Select(tr => new TestResultDto
            {
                ResultId = tr.Id,
                TestId = tr.TestId,
                UserId = tr.UserId,
                TestTitle = tr.Test.Title,
                SubjectName = tr.Test.Lesson.Subject.Name,
                ScorePercentage = tr.Score,
                CompletedAt = tr.CompletedAt
            })
            .ToListAsync();
    }

    public async Task<List<TestResultDto>> GetResultsForUserAsync(int userId)
    {
        return await _context.TestResults
            .Where(tr => tr.UserId == userId)
            .Include(tr => tr.Test).ThenInclude(t => t.Lesson).ThenInclude(l => l.Subject)
            .OrderByDescending(tr => tr.CompletedAt)
            .Select(tr => new TestResultDto
            {
                ResultId = tr.Id,
                TestId = tr.TestId,
                UserId = tr.UserId,
                TestTitle = tr.Test.Title,
                SubjectName = tr.Test.Lesson.Subject.Name,
                ScorePercentage = tr.Score,
                CompletedAt = tr.CompletedAt
            })
            .ToListAsync();
    }

    public async Task<TestResultDetailsDto?> GetResultDetailsForUserAsync(int resultId, int userId)
    {
        var result = await _context.TestResults
            .Where(tr => tr.Id == resultId && tr.UserId == userId)
            .Include(tr => tr.Test).ThenInclude(t => t.Lesson).ThenInclude(l => l.Subject)
            .FirstOrDefaultAsync();

        if (result == null)
        {
            return null;
        }

        var details = new TestResultDetailsDto
        {
            ResultId = result.Id,
            TestId = result.TestId,
            TestTitle = result.Test.Title,
            SubjectName = result.Test.Lesson.Subject.Name,
            ScorePercentage = result.Score,
            CompletedAt = result.CompletedAt,
            HasStoredReview = false,
            Questions = new List<TestResultQuestionReviewDto>()
        };

        try
        {
            var submittedAnswers = await _context.TestResultAnswers
                .Where(answer => answer.TestResultId == result.Id)
                .OrderBy(answer => answer.OrderIndex)
                .ToListAsync();

            details.HasStoredReview = submittedAnswers.Any();
            details.Questions = submittedAnswers
                .Select(answer => new TestResultQuestionReviewDto
                {
                    QuestionId = answer.QuestionId,
                    OrderIndex = answer.OrderIndex,
                    QuestionText = answer.QuestionText,
                    QuestionType = answer.QuestionType,
                    StudentAnswerText = answer.StudentAnswerText,
                    CorrectAnswerText = answer.CorrectAnswerText,
                    IsCorrect = answer.IsCorrect,
                    Explanation = answer.Explanation
                })
                .ToList();
        }
        catch
        {
            // Keep the original result flow working even when detailed review storage
            // is unavailable for older databases or legacy result rows.
            details.HasStoredReview = false;
            details.Questions = new List<TestResultQuestionReviewDto>();
        }

        return details;
    }

    public async Task<StudentDashboardStatsDto> GetDashboardStatsForUserAsync(int userId)
    {
        var userResults = await _context.TestResults
            .Where(tr => tr.UserId == userId)
            .Include(tr => tr.Test)
            .OrderByDescending(tr => tr.CompletedAt)
            .ToListAsync();

        if (userResults.Count == 0)
        {
            return new StudentDashboardStatsDto
            {
                CompletedTests = 0,
                AverageScore = 0,
                LastTest = "0"
            };
        }

        var lastResult = userResults[0];
        var averageScore = userResults.Average(tr => tr.Score);

        return new StudentDashboardStatsDto
        {
            CompletedTests = userResults.Count,
            AverageScore = Math.Round(averageScore, 2),
            LastTest = string.IsNullOrWhiteSpace(lastResult.Test?.Title) ? "0" : lastResult.Test.Title
        };
    }

    public async Task<TeacherOverviewStatsDto> GetTeacherOverviewStatsAsync(int teacherId)
    {
        var assignedSubjectsRaw = await _context.Subjects
            .Where(subject =>
                subject.CreatedByUserId == teacherId ||
                subject.TeacherAssignments.Any(assignment => assignment.TeacherId == teacherId))
            .Select(subject => new
            {
                SubjectId = subject.Id,
                SubjectName = subject.Name,
                subject.Grade,
                subject.Section,
                LessonCount = subject.Lessons.Count(),
                TestCount = subject.Lessons.SelectMany(lesson => lesson.Tests).Count()
            })
            .OrderBy(subject => subject.SubjectName)
            .ToListAsync();

        var assignedSubjects = assignedSubjectsRaw
            .Select(subject => new TeacherSubjectSnapshotDto
            {
                SubjectId = subject.SubjectId,
                SubjectName = subject.SubjectName,
                ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(subject.Grade, subject.Section) ?? string.Empty,
                LessonCount = subject.LessonCount,
                TestCount = subject.TestCount
            })
            .OrderBy(subject => subject.SubjectName)
            .ThenBy(subject => subject.ClassDisplay)
            .ToList();

        var assignedSubjectIds = assignedSubjects
            .Select(subject => subject.SubjectId)
            .Distinct()
            .ToList();

        var lessonCount = assignedSubjectIds.Count == 0
            ? 0
            : await _context.Lessons.CountAsync(lesson => assignedSubjectIds.Contains(lesson.SubjectId));

        var testCount = assignedSubjectIds.Count == 0
            ? 0
            : await _context.Tests.CountAsync(test => assignedSubjectIds.Contains(test.Lesson.SubjectId));

        var teacherResults = assignedSubjectIds.Count == 0
            ? new List<TestResult>()
            : await _context.TestResults
                .Where(result => assignedSubjectIds.Contains(result.Test.Lesson.SubjectId))
                .ToListAsync();

        var studentEngagementCount = teacherResults
            .Select(result => result.UserId)
            .Distinct()
            .Count();

        var averageTestPerformance = teacherResults.Count > 0
            ? Math.Round(teacherResults.Average(result => result.Score), 1)
            : 0;

        return new TeacherOverviewStatsDto
        {
            SubjectCount = assignedSubjects.Count,
            LessonCount = lessonCount,
            TestCount = testCount,
            StudentEngagementCount = studentEngagementCount,
            AverageTestPerformance = averageTestPerformance,
            Subjects = assignedSubjects
        };
    }

    public async Task<PublicPlatformOverviewDto> GetPlatformOverviewAsync()
    {
        var registeredStudents = await _context.Users
            .Include(user => user.Role)
            .CountAsync(user => user.Role.Name == "Student" && user.IsApproved);

        var lessonsCreated = await _context.Lessons.CountAsync();
        var testsCompleted = await _context.TestResults.CountAsync();

        return new PublicPlatformOverviewDto
        {
            RegisteredStudents = registeredStudents,
            LessonsCreated = lessonsCreated,
            TestsCompleted = testsCompleted
        };
    }

    public async Task<StatisticsDto> GetStatisticsAsync()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalTests = await _context.Tests.CountAsync();
        var totalResults = await _context.TestResults.CountAsync();
        var registeredStudents = await _context.Users
            .Include(user => user.Role)
            .CountAsync(user => user.Role.Name == "Student" && user.IsApproved);

        var pendingTeacherApprovals = await _context.Users
            .Include(user => user.Role)
            .CountAsync(user => user.Role.Name == "Teacher" && !user.IsApproved);

        double avgScore = totalResults > 0
            ? await _context.TestResults.AverageAsync(tr => tr.Score)
            : 0;

        var now = DateTime.UtcNow;
        var today = now.Date;
        var currentPeriodStart = today.AddDays(-13);
        var previousPeriodStart = currentPeriodStart.AddDays(-14);
        var previousPeriodEnd = currentPeriodStart.AddDays(-1);

        var currentAverage = await _context.TestResults
            .Where(tr => tr.CompletedAt >= currentPeriodStart && tr.CompletedAt < today.AddDays(1))
            .Select(tr => (double?)tr.Score)
            .AverageAsync() ?? 0;

        var previousAverage = await _context.TestResults
            .Where(tr => tr.CompletedAt >= previousPeriodStart && tr.CompletedAt < previousPeriodEnd.AddDays(1))
            .Select(tr => (double?)tr.Score)
            .AverageAsync() ?? 0;
        var averageScoreTrend = currentAverage - previousAverage;

        var activityWindowEnd = today.AddDays(1);
        var completedTestDates = await _context.TestResults
            .Where(tr => tr.CompletedAt >= currentPeriodStart && tr.CompletedAt < activityWindowEnd)
            .Select(tr => tr.CompletedAt)
            .ToListAsync();

        var lessonCreatedDates = await _context.Lessons
            .Where(lesson => lesson.CreatedAt >= currentPeriodStart && lesson.CreatedAt < activityWindowEnd)
            .Select(lesson => lesson.CreatedAt)
            .ToListAsync();

        var teacherApprovalDates = await _context.Users
            .Where(user =>
                user.Role.Name == "Teacher" &&
                user.IsApproved &&
                user.ApprovedAt.HasValue &&
                user.ApprovedAt.Value >= currentPeriodStart &&
                user.ApprovedAt.Value < activityWindowEnd)
            .Select(user => user.ApprovedAt!.Value)
            .ToListAsync();

        var completedTestsByDay = GroupByDate(completedTestDates);
        var lessonsCreatedByDay = GroupByDate(lessonCreatedDates);
        var teachersApprovedByDay = GroupByDate(teacherApprovalDates);

        var activity = new List<ActivityPointDto>();
        for (var offset = 13; offset >= 0; offset--)
        {
            var dayStart = today.AddDays(-offset);

            completedTestsByDay.TryGetValue(dayStart, out var completedTests);
            lessonsCreatedByDay.TryGetValue(dayStart, out var lessonsCreated);
            teachersApprovedByDay.TryGetValue(dayStart, out var teachersApproved);

            activity.Add(new ActivityPointDto
            {
                Label = dayStart.ToString("ddd"),
                Date = dayStart.ToString("yyyy-MM-dd"),
                Actions = completedTests + lessonsCreated + teachersApproved
            });
        }

        var subjectDistribution = await _context.Subjects
            .Select(subject => new SubjectDistributionDto
            {
                SubjectName = subject.Name,
                LessonCount = subject.Lessons.Count
            })
            .Where(entry => entry.LessonCount > 0)
            .OrderByDescending(entry => entry.LessonCount)
            .ThenBy(entry => entry.SubjectName)
            .Take(8)
            .ToListAsync();

        var recentActivity = await GetRecentActivityAsync(1, 8);

        var storageUsedBytes = GetUploadsSizeInBytesSafe();

        return new StatisticsDto
        {
            TotalUsers = totalUsers,
            TotalTests = totalTests,
            TotalResults = totalResults,
            AverageScore = Math.Round(avgScore, 2),
            AverageScoreTrend = Math.Round(averageScoreTrend, 2),
            RegisteredStudents = registeredStudents,
            PendingTeacherApprovals = pendingTeacherApprovals,
            StorageUsedBytes = storageUsedBytes,
            Activity = activity,
            SubjectDistribution = subjectDistribution,
            RecentActivity = recentActivity
        };
    }

    public async Task<RecentActivityPageDto> GetRecentActivityPageAsync(int page, int pageSize)
    {
        var safePage = Math.Max(page, 1);
        var safePageSize = Math.Clamp(pageSize, 1, 20);
        var recentActivity = await GetRecentActivityAsync();
        var totalCount = recentActivity.Count;
        var totalPages = Math.Max(1, (int)Math.Ceiling(totalCount / (double)safePageSize));
        var normalizedPage = Math.Min(safePage, totalPages);
        var items = recentActivity
            .Skip((normalizedPage - 1) * safePageSize)
            .Take(safePageSize)
            .ToList();

        return new RecentActivityPageDto
        {
            Items = items,
            Page = normalizedPage,
            PageSize = safePageSize,
            TotalCount = totalCount,
            TotalPages = totalPages
        };
    }

    private async Task<List<RecentActivityDto>> GetRecentActivityAsync(int page = 1, int pageSize = int.MaxValue)
    {
        var recentTestActivities = await _context.TestResults
            .Select(tr => new RecentActivityProjection
            {
                Type = "test_completed",
                ActorName = tr.User.Username,
                PrimaryText = tr.Test.Title,
                NumericValue = tr.Score,
                OccurredAt = tr.CompletedAt
            })
            .ToListAsync();

        var recentLessonActivities = await _context.Lessons
            .Select(lesson => new RecentActivityProjection
            {
                Type = "lesson_added",
                ActorName = lesson.CreatedByUser.Username,
                PrimaryText = lesson.Subject.Name,
                SecondaryText = lesson.Title,
                OccurredAt = lesson.CreatedAt
            })
            .ToListAsync();

        var recentTeacherApprovals = await _context.Users
            .Where(user => user.Role.Name == "Teacher" && user.IsApproved && user.ApprovedAt.HasValue)
            .Select(user => new RecentActivityProjection
            {
                Type = "teacher_approved",
                ActorName = user.Username,
                OccurredAt = user.ApprovedAt!.Value
            })
            .ToListAsync();

        return recentTestActivities
            .Concat(recentLessonActivities)
            .Concat(recentTeacherApprovals)
            .OrderByDescending(entry => entry.OccurredAt)
            .Skip(Math.Max(page - 1, 0) * pageSize)
            .Take(pageSize)
            .Select(MapRecentActivity)
            .ToList();
    }

    private static RecentActivityDto MapRecentActivity(RecentActivityProjection activity)
    {
        return activity.Type switch
        {
            "test_completed" => new RecentActivityDto
            {
                Type = activity.Type,
                Title = $"{activity.ActorName} completed {activity.PrimaryText}",
                Description = $"Score: {activity.NumericValue}%",
                OccurredAt = activity.OccurredAt
            },
            "lesson_added" => new RecentActivityDto
            {
                Type = activity.Type,
                Title = $"New lesson added to {activity.PrimaryText}",
                Description = $"{activity.ActorName} published {activity.SecondaryText}",
                OccurredAt = activity.OccurredAt
            },
            _ => new RecentActivityDto
            {
                Type = activity.Type,
                Title = $"{activity.ActorName} was approved",
                Description = "Teacher account is now active",
                OccurredAt = activity.OccurredAt
            }
        };
    }

    private static Dictionary<DateTime, int> GroupByDate(IEnumerable<DateTime> values)
    {
        return values
            .GroupBy(value => value.Date)
            .ToDictionary(group => group.Key, group => group.Count());
    }

    private long GetUploadsSizeInBytesSafe()
    {
        try
        {
            var root = _environment.WebRootPath;
            if (string.IsNullOrWhiteSpace(root))
            {
                root = Path.Combine(_environment.ContentRootPath, "wwwroot");
            }

            var uploadsPath = Path.Combine(root, "uploads");
            if (!Directory.Exists(uploadsPath))
            {
                return 0;
            }

            return Directory
                .EnumerateFiles(uploadsPath, "*", SearchOption.AllDirectories)
                .Sum(file => new FileInfo(file).Length);
        }
        catch
        {
            return 0;
        }
    }

    private async Task ReplaceQuestionsAsync(Test test, TestUpsertDto dto, IReadOnlyCollection<IFormFile> files)
    {
        var uploadedFiles = files.ToDictionary(file => file.Name, StringComparer.OrdinalIgnoreCase);
        var questions = dto.Questions?.ToList() ?? new List<QuestionUpsertDto>();

        for (var index = 0; index < questions.Count; index++)
        {
            var dtoQuestion = questions[index];

            if (string.IsNullOrWhiteSpace(dtoQuestion.Text))
                throw new InvalidOperationException($"Question {index + 1} must have text.");

            var questionType = NormalizeQuestionType(dtoQuestion.Type);
            ValidateQuestion(dtoQuestion, questionType, index);

            uploadedFiles.TryGetValue(dtoQuestion.ImageKey ?? string.Empty, out var imageFile);
            var question = new Question
            {
                Text = dtoQuestion.Text.Trim(),
                Type = questionType,
                CorrectTextAnswer = questionType == "text"
                    ? dtoQuestion.CorrectTextAnswer?.Trim()
                    : null,
                ImageUrl = await _fileStorageService.SaveFileAsync(imageFile, "question-images", ".png", ".jpg", ".jpeg", ".webp"),
                OrderIndex = index,
                TestId = test.Id
            };

            _context.Questions.Add(question);
            await _context.SaveChangesAsync();

            var answers = BuildAnswers(dtoQuestion, questionType);
            for (var answerIndex = 0; answerIndex < answers.Count; answerIndex++)
            {
                var dtoAnswer = answers[answerIndex];
                _context.Answers.Add(new Answer
                {
                    Text = dtoAnswer.Text.Trim(),
                    IsCorrect = dtoAnswer.IsCorrect,
                    OrderIndex = answerIndex,
                    QuestionId = question.Id
                });
            }

            await _context.SaveChangesAsync();
        }
    }

    private sealed class RecentActivityProjection
    {
        public string Type { get; set; } = string.Empty;
        public string ActorName { get; set; } = string.Empty;
        public string PrimaryText { get; set; } = string.Empty;
        public string SecondaryText { get; set; } = string.Empty;
        public double NumericValue { get; set; }
        public DateTime OccurredAt { get; set; }
    }

    private static string NormalizeQuestionType(string? value)
    {
        return value?.Trim().ToLowerInvariant() switch
        {
            "multiple-choice" => "multiple-choice",
            "text" => "text",
            "true-false" => "true-false",
            _ => "multiple-choice"
        };
    }

    private static void ValidateQuestion(QuestionUpsertDto dtoQuestion, string questionType, int index)
    {
        if (questionType == "text")
        {
            if (string.IsNullOrWhiteSpace(dtoQuestion.CorrectTextAnswer))
            {
                throw new InvalidOperationException($"Question {index + 1} must include a correct text answer.");
            }

            return;
        }

        if (dtoQuestion.Answers == null || dtoQuestion.Answers.Count == 0)
        {
            throw new InvalidOperationException($"Question {index + 1} must include answers.");
        }

        if (!dtoQuestion.Answers.Any(answer => answer.IsCorrect))
        {
            throw new InvalidOperationException($"Question {index + 1} must have a correct answer.");
        }
    }

    private static List<AnswerUpsertDto> BuildAnswers(QuestionUpsertDto dtoQuestion, string questionType)
    {
        if (questionType == "true-false")
        {
            var correctAnswer = dtoQuestion.Answers.FirstOrDefault(answer => answer.IsCorrect)?.Text?.Trim().ToLowerInvariant() ?? "true";
            var isTrueCorrect = correctAnswer == "true";

            return new List<AnswerUpsertDto>
            {
                new() { Text = "True", IsCorrect = isTrueCorrect },
                new() { Text = "False", IsCorrect = !isTrueCorrect }
            };
        }

        if (questionType == "text")
        {
            return new List<AnswerUpsertDto>();
        }

        return dtoQuestion.Answers
            .Where(answer => !string.IsNullOrWhiteSpace(answer.Text))
            .ToList();
    }

    private static void EnsureCanManage(int createdByUserId, int currentUserId, string currentRole)
    {
        if (string.Equals(currentRole, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (createdByUserId != currentUserId)
        {
            throw new InvalidOperationException("You can only manage tests you created.");
        }
    }
}

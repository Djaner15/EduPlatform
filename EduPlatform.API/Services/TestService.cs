using EduPlatform.API.Data;
using EduPlatform.API.DTOs;
using EduPlatform.API.Models;
using EduPlatform.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.API.Services;

public class TestService : ITestService
{
    private readonly AppDbContext _context;
    private readonly IFileStorageService _fileStorageService;

    public TestService(AppDbContext context, IFileStorageService fileStorageService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
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

        foreach (var q in questions)
        {
            if (!answerMap.TryGetValue(q.Id, out var submittedAnswer))
                continue; // unanswered counts as incorrect

            if (string.Equals(q.Type, "text", StringComparison.OrdinalIgnoreCase))
            {
                var expected = q.CorrectTextAnswer?.Trim();
                var actual = submittedAnswer.TextAnswer?.Trim();
                if (!string.IsNullOrWhiteSpace(expected) &&
                    !string.IsNullOrWhiteSpace(actual) &&
                    string.Equals(expected, actual, StringComparison.OrdinalIgnoreCase))
                {
                    correct++;
                }
            }
            else
            {
                var answer = q.Answers.FirstOrDefault(a => a.Id == submittedAnswer.AnswerId);
                if (answer != null && answer.IsCorrect)
                    correct++;
            }
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
        await _context.SaveChangesAsync();

        return new TestResultDto
        {
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
                TestId = tr.TestId,
                UserId = tr.UserId,
                TestTitle = tr.Test.Title,
                SubjectName = tr.Test.Lesson.Subject.Name,
                ScorePercentage = tr.Score,
                CompletedAt = tr.CompletedAt
            })
            .ToListAsync();
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

    public async Task<StatisticsDto> GetStatisticsAsync()
    {
        var totalUsers = await _context.Users.CountAsync();
        var totalTests = await _context.Tests.CountAsync();
        var totalResults = await _context.TestResults.CountAsync();
        double avgScore = 0;
        if (totalResults > 0)
            avgScore = await _context.TestResults.AverageAsync(tr => tr.Score);

        return new StatisticsDto
        {
            TotalUsers = totalUsers,
            TotalTests = totalTests,
            TotalResults = totalResults,
            AverageScore = Math.Round(avgScore, 2)
        };
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

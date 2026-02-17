using EduPlatform.API.Data;
using EduPlatform.API.DTOs;
using EduPlatform.API.Models;
using EduPlatform.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.API.Services;

public class TestService : ITestService
{
    private readonly AppDbContext _context;

    public TestService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<TestDto>> GetAllAsync()
    {
        return await _context.Tests
            .Include(t => t.Questions).ThenInclude(q => q.Answers)
            .Select(t => new TestDto
            {
                Id = t.Id,
                Title = t.Title,
                LessonId = t.LessonId,
                Questions = t.Questions.Select(q => new QuestionDto
                {
                    Id = q.Id,
                    Text = q.Text,
                    Answers = q.Answers.Select(a => new AnswerDto
                    {
                        Id = a.Id,
                        Text = a.Text,
                        IsCorrect = a.IsCorrect
                    }).ToList()
                }).ToList()
            })
            .ToListAsync();
    }

    public async Task<TestDto?> GetByIdAsync(int id)
    {
        var test = await _context.Tests
            .Include(t => t.Questions).ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(t => t.Id == id);

        if (test == null)
            return null;

        return new TestDto
        {
            Id = test.Id,
            Title = test.Title,
            LessonId = test.LessonId,
            Questions = test.Questions.Select(q => new QuestionDto
            {
                Id = q.Id,
                Text = q.Text,
                Answers = q.Answers.Select(a => new AnswerDto
                {
                    Id = a.Id,
                    Text = a.Text,
                    IsCorrect = a.IsCorrect
                }).ToList()
            }).ToList()
        };
    }

    public async Task<TestDto> CreateAsync(CreateTestDto dto)
    {
        // Validate lesson exists
        var lesson = await _context.Lessons.FindAsync(dto.LessonId);
        if (lesson == null)
            throw new InvalidOperationException("Lesson not found");

        var test = new Test
        {
            Title = dto.Title,
            LessonId = dto.LessonId
        };

        _context.Tests.Add(test);
        await _context.SaveChangesAsync();

        return new TestDto { Id = test.Id, Title = test.Title, LessonId = test.LessonId };
    }

    public async Task<QuestionDto> AddQuestionAsync(int testId, CreateQuestionDto dto)
    {
        var test = await _context.Tests
            .Include(t => t.Questions).ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(t => t.Id == testId);

        if (test == null)
            throw new KeyNotFoundException("Test not found");

        if (string.IsNullOrWhiteSpace(dto.Text))
            throw new InvalidOperationException("Question text is required");

        if (dto.Answers == null || !dto.Answers.Any())
            throw new InvalidOperationException("At least one answer is required");

        var question = new Question
        {
            Text = dto.Text,
            TestId = testId
        };

        _context.Questions.Add(question);
        await _context.SaveChangesAsync();

        // Add answers
        foreach (var a in dto.Answers)
        {
            var answer = new Answer
            {
                Text = a.Text,
                IsCorrect = a.IsCorrect,
                QuestionId = question.Id
            };
            _context.Answers.Add(answer);
        }

        await _context.SaveChangesAsync();

        await _context.Entry(question).Collection(q => q.Answers).LoadAsync();

        return new QuestionDto
        {
            Id = question.Id,
            Text = question.Text,
            Answers = question.Answers.Select(a => new AnswerDto
            {
                Id = a.Id,
                Text = a.Text,
                IsCorrect = a.IsCorrect
            }).ToList()
        };
    }

    /// <summary>
    /// Submits a test, calculates score, persists TestResult and returns TestResultDto
    /// </summary>
    public async Task<TestResultDto> SubmitTestAsync(int testId, int userId, SubmitTestDto dto)
    {
        var test = await _context.Tests
            .Include(t => t.Questions).ThenInclude(q => q.Answers)
            .FirstOrDefaultAsync(t => t.Id == testId);

        if (test == null)
            throw new KeyNotFoundException("Test not found");

        var questions = test.Questions.ToList();
        if (!questions.Any())
            throw new InvalidOperationException("Test has no questions");

        // Map answers by question
        var answerMap = dto.Answers?.ToDictionary(a => a.QuestionId, a => a.AnswerId) ?? new Dictionary<int,int>();

        int total = questions.Count;
        int correct = 0;

        foreach (var q in questions)
        {
            if (!answerMap.TryGetValue(q.Id, out var selectedAnswerId))
                continue; // unanswered counts as incorrect

            var answer = q.Answers.FirstOrDefault(a => a.Id == selectedAnswerId);
            if (answer != null && answer.IsCorrect)
                correct++;
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
            ScorePercentage = percentage,
            CompletedAt = result.CompletedAt
        };
    }
}

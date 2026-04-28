using EduPlatform.API.Data;
using EduPlatform.API.DTOs;
using EduPlatform.API.Models;
using EduPlatform.API.Services;
using EduPlatform.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;

namespace EduPlatform.API.Tests;

public class TestServiceSubmitTests
{
    [Fact]
    public async Task SubmitTestAsync_AllMultipleChoiceAnswersCorrect_Returns100AndPersistsResult()
    {
        await using var context = CreateContext();
        SeedStudentTestGraph(context);
        var service = CreateService(context);

        var dto = new SubmitTestDto
        {
            Answers = new List<SubmitAnswerDto>
            {
                new() { QuestionId = 101, AnswerId = 1002 },
                new() { QuestionId = 102, AnswerId = 1005 }
            }
        };

        var result = await service.SubmitTestAsync(100, 10, dto);

        Assert.Equal(100, result.ScorePercentage);
        Assert.Equal("Algebra Quiz", result.TestTitle);
        Assert.Equal("Mathematics", result.SubjectName);

        var persisted = await context.TestResults.SingleAsync();
        Assert.Equal(10, persisted.UserId);
        Assert.Equal(100, persisted.TestId);
        Assert.Equal(100, persisted.Score);
    }

    [Fact]
    public async Task SubmitTestAsync_NoAnswersSubmitted_ReturnsZeroAndPersistsResult()
    {
        await using var context = CreateContext();
        SeedStudentTestGraph(context);
        var service = CreateService(context);

        var result = await service.SubmitTestAsync(100, 10, new SubmitTestDto());

        Assert.Equal(0, result.ScorePercentage);
        Assert.Equal(0, await context.TestResults.Select(r => r.Score).SingleAsync());
    }

    [Fact]
    public async Task SubmitTestAsync_PartiallyCorrectAnswers_ReturnsRoundedPercentage()
    {
        await using var context = CreateContext();
        SeedStudentTestGraph(context, includeThirdQuestion: true);
        var service = CreateService(context);

        var dto = new SubmitTestDto
        {
            Answers = new List<SubmitAnswerDto>
            {
                new() { QuestionId = 101, AnswerId = 1002 },
                new() { QuestionId = 102, AnswerId = 1004 },
                new() { QuestionId = 103, AnswerId = 1008 }
            }
        };

        var result = await service.SubmitTestAsync(100, 10, dto);

        Assert.Equal(67, result.ScorePercentage);
        Assert.Equal(67, await context.TestResults.Select(r => r.Score).SingleAsync());
    }

    [Fact]
    public async Task SubmitTestAsync_TextQuestion_CorrectAnswerIsCaseInsensitive()
    {
        await using var context = CreateContext();
        SeedTextQuestionGraph(context);
        var service = CreateService(context);

        var dto = new SubmitTestDto
        {
            Answers = new List<SubmitAnswerDto>
            {
                new() { QuestionId = 201, TextAnswer = " h2o " }
            }
        };

        var result = await service.SubmitTestAsync(200, 10, dto);

        Assert.Equal(100, result.ScorePercentage);
    }

    [Fact]
    public async Task SubmitTestAsync_TextQuestion_WrongAnswerReturnsZero()
    {
        await using var context = CreateContext();
        SeedTextQuestionGraph(context);
        var service = CreateService(context);

        var dto = new SubmitTestDto
        {
            Answers = new List<SubmitAnswerDto>
            {
                new() { QuestionId = 201, TextAnswer = "CO2" }
            }
        };

        var result = await service.SubmitTestAsync(200, 10, dto);

        Assert.Equal(0, result.ScorePercentage);
    }

    [Fact]
    public async Task SubmitTestAsync_UnknownAnswerId_CountsAsIncorrect()
    {
        await using var context = CreateContext();
        SeedStudentTestGraph(context);
        var service = CreateService(context);

        var dto = new SubmitTestDto
        {
            Answers = new List<SubmitAnswerDto>
            {
                new() { QuestionId = 101, AnswerId = 999999 },
                new() { QuestionId = 102, AnswerId = 1005 }
            }
        };

        var result = await service.SubmitTestAsync(100, 10, dto);

        Assert.Equal(50, result.ScorePercentage);
    }

    [Fact]
    public async Task SubmitTestAsync_TestDoesNotExist_ThrowsKeyNotFoundException()
    {
        await using var context = CreateContext();
        SeedStudentOnly(context);
        var service = CreateService(context);

        await Assert.ThrowsAsync<KeyNotFoundException>(() =>
            service.SubmitTestAsync(404, 10, new SubmitTestDto()));
    }

    [Fact]
    public async Task SubmitTestAsync_StudentDoesNotExist_ThrowsInvalidOperationException()
    {
        await using var context = CreateContext();
        SeedTestOnly(context);
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SubmitTestAsync(100, 999, new SubmitTestDto()));

        Assert.Equal("Student account not found.", exception.Message);
    }

    [Fact]
    public async Task SubmitTestAsync_StudentCannotAccessHigherGradeTest_ThrowsInvalidOperationException()
    {
        await using var context = CreateContext();
        SeedStudentTestGraph(context, studentGrade: 8, testGrade: 10);
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SubmitTestAsync(100, 10, new SubmitTestDto()));

        Assert.Equal("This test is not assigned to your class.", exception.Message);
    }

    [Fact]
    public async Task SubmitTestAsync_TestHasNoQuestions_ThrowsInvalidOperationException()
    {
        await using var context = CreateContext();
        SeedStudentTestGraph(context, withQuestions: false);
        var service = CreateService(context);

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SubmitTestAsync(100, 10, new SubmitTestDto()));

        Assert.Equal("Test has no questions", exception.Message);
    }

    [Fact]
    public async Task SubmitTestAsync_UnansweredQuestionIsTreatedAsIncorrect()
    {
        await using var context = CreateContext();
        SeedStudentTestGraph(context);
        var service = CreateService(context);

        var dto = new SubmitTestDto
        {
            Answers = new List<SubmitAnswerDto>
            {
                new() { QuestionId = 101, AnswerId = 1002 }
            }
        };

        var result = await service.SubmitTestAsync(100, 10, dto);

        Assert.Equal(50, result.ScorePercentage);
    }

    [Fact]
    public async Task SubmitTestAsync_PersistsQuestionReviewSnapshots()
    {
        await using var context = CreateContext();
        SeedStudentTestGraph(context);
        var service = CreateService(context);

        var dto = new SubmitTestDto
        {
            Answers = new List<SubmitAnswerDto>
            {
                new() { QuestionId = 101, AnswerId = 1002 },
                new() { QuestionId = 102, AnswerId = 1004 }
            }
        };

        var result = await service.SubmitTestAsync(100, 10, dto);
        var review = await service.GetResultDetailsForUserAsync(result.ResultId, 10);

        Assert.NotNull(review);
        Assert.True(review!.HasStoredReview);
        Assert.Equal(2, review.Questions.Count);
        Assert.True(review.Questions.Single(q => q.QuestionId == 101).IsCorrect);

        var wrongQuestion = review.Questions.Single(q => q.QuestionId == 102);
        Assert.False(wrongQuestion.IsCorrect);
        Assert.Equal("4", wrongQuestion.StudentAnswerText);
        Assert.Equal("3", wrongQuestion.CorrectAnswerText);
        Assert.Contains("Correct answer", wrongQuestion.Explanation);
    }

    private static TestService CreateService(AppDbContext context)
    {
        var fileStorageMock = new Mock<IFileStorageService>(MockBehavior.Strict);
        return new TestService(context, fileStorageMock.Object);
    }

    private static AppDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString("N"))
            .Options;

        return new AppDbContext(options);
    }

    private static void SeedStudentOnly(AppDbContext context)
    {
        context.Roles.Add(new Role { Id = 1, Name = "Student" });
        context.Users.Add(new User
        {
            Id = 10,
            FullName = "Student User",
            Username = "student",
            Email = "student@test.com",
            PasswordHash = "hash",
            RoleId = 1,
            Grade = 9,
            Section = "A"
        });
        context.SaveChanges();
    }

    private static void SeedTestOnly(AppDbContext context)
    {
        SeedRoles(context);
        SeedCreator(context);
        SeedSubjectLesson(context);
        context.Tests.Add(new Test
        {
            Id = 100,
            Title = "Algebra Quiz",
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = 20,
            LessonId = 30,
            Grade = 9,
            Section = "A"
        });
        context.SaveChanges();
    }

    private static void SeedTextQuestionGraph(AppDbContext context)
    {
        SeedRoles(context);
        SeedCreator(context);
        SeedStudent(context, 9);
        SeedSubjectLesson(context);

        context.Tests.Add(new Test
        {
            Id = 200,
            Title = "Chemistry Text Quiz",
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = 20,
            LessonId = 30,
            Grade = 9,
            Section = "A",
            Questions = new List<Question>
            {
                new()
                {
                    Id = 201,
                    Text = "Chemical formula of water",
                    Type = "text",
                    CorrectTextAnswer = "H2O",
                    OrderIndex = 1
                }
            }
        });

        context.SaveChanges();
    }

    private static void SeedStudentTestGraph(
        AppDbContext context,
        int studentGrade = 9,
        int testGrade = 9,
        bool withQuestions = true,
        bool includeThirdQuestion = false)
    {
        SeedRoles(context);
        SeedCreator(context);
        SeedStudent(context, studentGrade);
        SeedSubjectLesson(context);

        var test = new Test
        {
            Id = 100,
            Title = "Algebra Quiz",
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = 20,
            LessonId = 30,
            Grade = testGrade,
            Section = "A"
        };

        if (withQuestions)
        {
            test.Questions = new List<Question>
            {
                new()
                {
                    Id = 101,
                    Text = "2 + 2 = ?",
                    Type = "multiple-choice",
                    OrderIndex = 1,
                    Answers = new List<Answer>
                    {
                        new() { Id = 1001, Text = "3", IsCorrect = false, OrderIndex = 1 },
                        new() { Id = 1002, Text = "4", IsCorrect = true, OrderIndex = 2 },
                        new() { Id = 1003, Text = "5", IsCorrect = false, OrderIndex = 3 }
                    }
                },
                new()
                {
                    Id = 102,
                    Text = "3 x 3 = ?",
                    Type = "multiple-choice",
                    OrderIndex = 2,
                    Answers = new List<Answer>
                    {
                        new() { Id = 1004, Text = "6", IsCorrect = false, OrderIndex = 1 },
                        new() { Id = 1005, Text = "9", IsCorrect = true, OrderIndex = 2 },
                        new() { Id = 1006, Text = "12", IsCorrect = false, OrderIndex = 3 }
                    }
                }
            };

            if (includeThirdQuestion)
            {
                test.Questions.Add(new Question
                {
                    Id = 103,
                    Text = "10 - 7 = ?",
                    Type = "multiple-choice",
                    OrderIndex = 3,
                    Answers = new List<Answer>
                    {
                        new() { Id = 1007, Text = "2", IsCorrect = false, OrderIndex = 1 },
                        new() { Id = 1008, Text = "3", IsCorrect = true, OrderIndex = 2 },
                        new() { Id = 1009, Text = "4", IsCorrect = false, OrderIndex = 3 }
                    }
                });
            }
        }

        context.Tests.Add(test);
        context.SaveChanges();
    }

    private static void SeedRoles(AppDbContext context)
    {
        context.Roles.AddRange(
            new Role { Id = 1, Name = "Student" },
            new Role { Id = 2, Name = "Teacher" });
    }

    private static void SeedCreator(AppDbContext context)
    {
        context.Users.Add(new User
        {
            Id = 20,
            FullName = "Teacher User",
            Username = "teacher",
            Email = "teacher@test.com",
            PasswordHash = "hash",
            RoleId = 2,
            IsApproved = true
        });
    }

    private static void SeedStudent(AppDbContext context, int grade)
    {
        context.Users.Add(new User
        {
            Id = 10,
            FullName = "Student User",
            Username = "student",
            Email = "student@test.com",
            PasswordHash = "hash",
            RoleId = 1,
            Grade = grade,
            Section = "A",
            IsApproved = true
        });
    }

    private static void SeedSubjectLesson(AppDbContext context)
    {
        context.Subjects.Add(new Subject
        {
            Id = 40,
            Name = "Mathematics",
            Description = "Math subject",
            CreatedAt = DateTime.UtcNow,
            Grade = 9,
            Section = "A",
            CreatedByUserId = 20
        });

        context.Lessons.Add(new Lesson
        {
            Id = 30,
            Title = "Algebra Basics",
            Content = "Lesson content",
            CreatedAt = DateTime.UtcNow,
            CreatedByUserId = 20,
            SubjectId = 40,
            Grade = 9,
            Section = "A"
        });
    }
}

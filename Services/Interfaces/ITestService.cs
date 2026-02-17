using EduPlatform.API.DTOs;

namespace EduPlatform.API.Services.Interfaces;

public interface ITestService
{
    Task<List<TestDto>> GetAllAsync();
    Task<TestDto?> GetByIdAsync(int id);
    Task<TestDto> CreateAsync(CreateTestDto dto);
    Task<QuestionDto> AddQuestionAsync(int testId, CreateQuestionDto dto);
    /// <summary>
    /// Submits answers for a test, calculates and saves result, returns percentage score
    /// </summary>
    Task<TestResultDto> SubmitTestAsync(int testId, int userId, SubmitTestDto dto);
}

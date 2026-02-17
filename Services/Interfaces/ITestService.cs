using EduPlatform.API.DTOs;

namespace EduPlatform.API.Services.Interfaces;

public interface ITestService
{
    Task<List<TestDto>> GetAllAsync();
    Task<TestDto?> GetByIdAsync(int id);
    Task<TestDto> CreateAsync(CreateTestDto dto);
    Task<QuestionDto> AddQuestionAsync(int testId, CreateQuestionDto dto);
}

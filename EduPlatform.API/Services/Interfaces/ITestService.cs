using EduPlatform.API.DTOs;

namespace EduPlatform.API.Services.Interfaces;

public interface ITestService
{
    Task<List<TestDto>> GetAllAsync(int currentUserId, string currentRole);
    Task<TestDto?> GetByIdAsync(int id, int currentUserId, string currentRole);
    Task<TestDto> CreateAsync(TestUpsertDto dto, IReadOnlyCollection<IFormFile> files, int currentUserId);
    Task<TestDto> UpdateAsync(int id, TestUpsertDto dto, IReadOnlyCollection<IFormFile> files, int currentUserId, string currentRole);
    Task DeleteAsync(int id, int currentUserId, string currentRole);
    /// <summary>
    /// Submits answers for a test, calculates and saves result, returns percentage score
    /// </summary>
    Task<TestResultDto> SubmitTestAsync(int testId, int userId, SubmitTestDto dto);
    /// <summary>
    /// Returns all test results
    /// </summary>
    Task<List<TestResultDto>> GetAllResultsAsync();
    Task<List<TestResultDto>> GetResultsForUserAsync(int userId);

    /// <summary>
    /// Returns basic statistics
    /// </summary>
    Task<StatisticsDto> GetStatisticsAsync();
}

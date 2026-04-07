using EduPlatform.API.DTOs;
namespace EduPlatform.API.Services.Interfaces;

public interface ISubjectService
{
    /// <summary>
    /// Gets all subjects
    /// </summary>
    Task<List<SubjectDto>> GetAllAsync(int currentUserId, string currentRole);

    /// <summary>
    /// Gets a subject by ID
    /// </summary>
    Task<SubjectDto?> GetByIdAsync(int id, int currentUserId, string currentRole);

    /// <summary>
    /// Creates a new subject
    /// </summary>
    Task<SubjectDto> CreateAsync(CreateSubjectDto dto, int currentUserId);

    /// <summary>
    /// Updates an existing subject
    /// </summary>
    Task<SubjectDto> UpdateAsync(int id, UpdateSubjectDto dto, int currentUserId, string currentRole);

    /// <summary>
    /// Deletes a subject by ID
    /// </summary>
    Task DeleteAsync(int id, int currentUserId, string currentRole);
}

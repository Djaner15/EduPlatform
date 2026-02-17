using EduPlatform.API.DTOs;
using EduPlatform.API.Models;

namespace EduPlatform.API.Services.Interfaces;

public interface ISubjectService
{
    /// <summary>
    /// Gets all subjects
    /// </summary>
    Task<List<SubjectDto>> GetAllAsync();

    /// <summary>
    /// Gets a subject by ID
    /// </summary>
    Task<SubjectDto?> GetByIdAsync(int id);

    /// <summary>
    /// Creates a new subject
    /// </summary>
    Task<SubjectDto> CreateAsync(CreateSubjectDto dto);

    /// <summary>
    /// Updates an existing subject
    /// </summary>
    Task<SubjectDto> UpdateAsync(int id, UpdateSubjectDto dto);

    /// <summary>
    /// Deletes a subject by ID
    /// </summary>
    Task DeleteAsync(int id);
}

using EduPlatform.API.DTOs;
using EduPlatform.API.Models;

namespace EduPlatform.API.Services.Interfaces;

public interface ILessonService
{
    /// <summary>
    /// Gets all lessons
    /// </summary>
    Task<List<LessonDto>> GetAllAsync();

    /// <summary>
    /// Gets a lesson by ID
    /// </summary>
    Task<LessonDto?> GetByIdAsync(int id);

    /// <summary>
    /// Gets all lessons for a specific subject
    /// </summary>
    Task<List<LessonDto>> GetBySubjectIdAsync(int subjectId);

    /// <summary>
    /// Creates a new lesson
    /// </summary>
    Task<LessonDto> CreateAsync(CreateLessonDto dto);

    /// <summary>
    /// Updates an existing lesson
    /// </summary>
    Task<LessonDto> UpdateAsync(int id, UpdateLessonDto dto);

    /// <summary>
    /// Deletes a lesson by ID
    /// </summary>
    Task DeleteAsync(int id);
}

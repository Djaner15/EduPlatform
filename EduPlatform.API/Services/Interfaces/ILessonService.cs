using EduPlatform.API.DTOs;
using Microsoft.AspNetCore.Http;

namespace EduPlatform.API.Services.Interfaces;

public interface ILessonService
{
    /// <summary>
    /// Gets all lessons
    /// </summary>
    Task<List<LessonDto>> GetAllAsync(int currentUserId, string currentRole, bool ignoreClassFilter = false);

    /// <summary>
    /// Gets a lesson by ID
    /// </summary>
    Task<LessonDto?> GetByIdAsync(int id, int currentUserId, string currentRole);

    /// <summary>
    /// Gets all lessons for a specific subject
    /// </summary>
    Task<List<LessonDto>> GetBySubjectIdAsync(int subjectId, int currentUserId, string currentRole, bool ignoreClassFilter = false);

    /// <summary>
    /// Creates a new lesson
    /// </summary>
    Task<LessonDto> CreateAsync(LessonUpsertDto dto, IFormFile? image, IFormFile? attachment, int currentUserId);

    /// <summary>
    /// Updates an existing lesson
    /// </summary>
    Task<LessonDto> UpdateAsync(int id, LessonUpsertDto dto, IFormFile? image, IFormFile? attachment, int currentUserId, string currentRole);

    /// <summary>
    /// Deletes a lesson by ID
    /// </summary>
    Task DeleteAsync(int id, int currentUserId, string currentRole);
}

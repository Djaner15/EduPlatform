using EduPlatform.API.Data;
using EduPlatform.API.DTOs;
using EduPlatform.API.Models;
using EduPlatform.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.API.Services;

public class LessonService : ILessonService
{
    private readonly AppDbContext _context;

    public LessonService(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Gets all lessons with subject information
    /// </summary>
    public async Task<List<LessonDto>> GetAllAsync()
    {
        return await _context.Lessons
            .Include(l => l.Subject)
            .Select(l => new LessonDto
            {
                Id = l.Id,
                Title = l.Title,
                Content = l.Content,
                SubjectId = l.SubjectId,
                SubjectName = l.Subject!.Name,
                GradeId = l.GradeId
            })
            .ToListAsync();
    }

    /// <summary>
    /// Gets a lesson by ID with subject information
    /// </summary>
    public async Task<LessonDto?> GetByIdAsync(int id)
    {
        var lesson = await _context.Lessons
            .Include(l => l.Subject)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lesson == null)
            return null;

        return new LessonDto
        {
            Id = lesson.Id,
            Title = lesson.Title,
            Content = lesson.Content,
            SubjectId = lesson.SubjectId,
            SubjectName = lesson.Subject!.Name,
            GradeId = lesson.GradeId
        };
    }

    /// <summary>
    /// Gets all lessons for a specific subject
    /// </summary>
    public async Task<List<LessonDto>> GetBySubjectIdAsync(int subjectId)
    {
        // Verify subject exists
        var subject = await _context.Subjects.FindAsync(subjectId);
        if (subject == null)
            throw new KeyNotFoundException($"Subject with ID {subjectId} not found");

        return await _context.Lessons
            .Include(l => l.Subject)
            .Where(l => l.SubjectId == subjectId)
            .Select(l => new LessonDto
            {
                Id = l.Id,
                Title = l.Title,
                Content = l.Content,
                SubjectId = l.SubjectId,
                SubjectName = l.Subject!.Name,
                GradeId = l.GradeId
            })
            .ToListAsync();
    }

    /// <summary>
    /// Creates a new lesson
    /// </summary>
    public async Task<LessonDto> CreateAsync(CreateLessonDto dto)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Lesson title is required");

        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new InvalidOperationException("Lesson content is required");

        // Verify subject exists
        var subject = await _context.Subjects.FindAsync(dto.SubjectId);
        if (subject == null)
            throw new InvalidOperationException("Subject not found");

        // Verify grade exists
        var grade = await _context.Grades.FindAsync(dto.GradeId);
        if (grade == null)
            throw new InvalidOperationException("Grade not found");

        var lesson = new Lesson
        {
            Title = dto.Title,
            Content = dto.Content,
            SubjectId = dto.SubjectId,
            GradeId = dto.GradeId
        };

        _context.Lessons.Add(lesson);
        await _context.SaveChangesAsync();

        // Reload with relations
        await _context.Entry(lesson).Reference(l => l.Subject).LoadAsync();

        return new LessonDto
        {
            Id = lesson.Id,
            Title = lesson.Title,
            Content = lesson.Content,
            SubjectId = lesson.SubjectId,
            SubjectName = lesson.Subject!.Name,
            GradeId = lesson.GradeId
        };
    }

    /// <summary>
    /// Updates an existing lesson
    /// </summary>
    public async Task<LessonDto> UpdateAsync(int id, UpdateLessonDto dto)
    {
        var lesson = await _context.Lessons
            .Include(l => l.Subject)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lesson == null)
            throw new KeyNotFoundException($"Lesson with ID {id} not found");

        // Validate input
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Lesson title is required");

        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new InvalidOperationException("Lesson content is required");

        // Verify subject exists if changed
        if (dto.SubjectId != lesson.SubjectId)
        {
            var subject = await _context.Subjects.FindAsync(dto.SubjectId);
            if (subject == null)
                throw new InvalidOperationException("Subject not found");
        }

        // Verify grade exists if changed
        if (dto.GradeId != lesson.GradeId)
        {
            var grade = await _context.Grades.FindAsync(dto.GradeId);
            if (grade == null)
                throw new InvalidOperationException("Grade not found");
        }

        lesson.Title = dto.Title;
        lesson.Content = dto.Content;
        lesson.SubjectId = dto.SubjectId;
        lesson.GradeId = dto.GradeId;

        await _context.SaveChangesAsync();

        return new LessonDto
        {
            Id = lesson.Id,
            Title = lesson.Title,
            Content = lesson.Content,
            SubjectId = lesson.SubjectId,
            SubjectName = lesson.Subject!.Name,
            GradeId = lesson.GradeId
        };
    }

    /// <summary>
    /// Deletes a lesson by ID
    /// </summary>
    public async Task DeleteAsync(int id)
    {
        var lesson = await _context.Lessons.FindAsync(id);

        if (lesson == null)
            throw new KeyNotFoundException($"Lesson with ID {id} not found");

        _context.Lessons.Remove(lesson);
        await _context.SaveChangesAsync();
    }
}

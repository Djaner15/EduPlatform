using EduPlatform.API.Data;
using EduPlatform.API.DTOs;
using EduPlatform.API.Models;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.API.Services;

public class SubjectService : ISubjectService
{
    private readonly AppDbContext _context;

    public SubjectService(AppDbContext context)
    {
        _context = context;
    }

    /// <summary>
    /// Gets all subjects
    /// </summary>
    public async Task<List<SubjectDto>> GetAllAsync()
    {
        return await _context.Subjects
            .Select(s => new SubjectDto
            {
                Id = s.Id,
                Name = s.Name,
                Description = s.Description
            })
            .ToListAsync();
    }

    /// <summary>
    /// Gets a subject by ID
    /// </summary>
    public async Task<SubjectDto?> GetByIdAsync(int id)
    {
        var subject = await _context.Subjects.FindAsync(id);

        if (subject == null)
            return null;

        return new SubjectDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Description = subject.Description
        };
    }

    /// <summary>
    /// Creates a new subject
    /// </summary>
    public async Task<SubjectDto> CreateAsync(CreateSubjectDto dto)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("Subject name is required");

        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new InvalidOperationException("Subject description is required");

        // Check for duplicate name
        if (await _context.Subjects.AnyAsync(s => s.Name == dto.Name))
            throw new InvalidOperationException("Subject with this name already exists");

        var subject = new Subject
        {
            Name = dto.Name,
            Description = dto.Description
        };

        _context.Subjects.Add(subject);
        await _context.SaveChangesAsync();

        return new SubjectDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Description = subject.Description
        };
    }

    /// <summary>
    /// Updates an existing subject
    /// </summary>
    public async Task<SubjectDto> UpdateAsync(int id, UpdateSubjectDto dto)
    {
        var subject = await _context.Subjects.FindAsync(id);

        if (subject == null)
            throw new KeyNotFoundException($"Subject with ID {id} not found");

        // Validate input
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("Subject name is required");

        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new InvalidOperationException("Subject description is required");

        // Check for duplicate name (excluding current subject)
        if (await _context.Subjects.AnyAsync(s => s.Name == dto.Name && s.Id != id))
            throw new InvalidOperationException("Subject with this name already exists");

        subject.Name = dto.Name;
        subject.Description = dto.Description;

        await _context.SaveChangesAsync();

        return new SubjectDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Description = subject.Description
        };
    }

    /// <summary>
    /// Deletes a subject by ID
    /// </summary>
    public async Task DeleteAsync(int id)
    {
        var subject = await _context.Subjects.FindAsync(id);

        if (subject == null)
            throw new KeyNotFoundException($"Subject with ID {id} not found");

        _context.Subjects.Remove(subject);
        await _context.SaveChangesAsync();
    }
}

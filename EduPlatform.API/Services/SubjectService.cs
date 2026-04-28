using EduPlatform.API.Data;
using EduPlatform.API.DTOs;
using EduPlatform.API.Models;
using EduPlatform.API.Services.Interfaces;
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
    public async Task<List<SubjectDto>> GetAllAsync(int currentUserId, string currentRole)
    {
        var query = _context.Subjects
            .Include(s => s.CreatedByUser)
            .AsQueryable();

        if (string.Equals(currentRole, "Teacher", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(s =>
                s.CreatedByUserId == currentUserId ||
                s.TeacherAssignments.Any(assignment => assignment.TeacherId == currentUserId));
        }
        else if (string.Equals(currentRole, "Student", StringComparison.OrdinalIgnoreCase) && currentUserId > 0)
        {
            var student = await _context.Users.FindAsync(currentUserId)
                ?? throw new InvalidOperationException("Student account not found.");

            if (!student.Grade.HasValue)
            {
                throw new InvalidOperationException("Student grade assignment is missing.");
            }

            query = query.Where(s => s.Grade >= 8 && s.Grade <= student.Grade.Value);
        }

        return await query
            .Select(s => new SubjectDto
            {
                Id = s.Id,
                Name = s.Name,
                Description = s.Description,
                CreatedAt = s.CreatedAt,
                Grade = s.Grade,
                Section = s.Section,
                ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(s.Grade, s.Section) ?? string.Empty,
                CreatedByUserId = s.CreatedByUserId,
                CreatedByUsername = s.CreatedByUser.Username,
                CreatedByFullName = s.CreatedByUser.FullName,
                CreatedByIsApproved = s.CreatedByUser.IsApproved
            })
            .ToListAsync();
    }

    /// <summary>
    /// Gets a subject by ID
    /// </summary>
    public async Task<SubjectDto?> GetByIdAsync(int id, int currentUserId, string currentRole)
    {
        var subject = await _context.Subjects
            .Include(s => s.CreatedByUser)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (subject == null)
            return null;

        if (string.Equals(currentRole, "Teacher", StringComparison.OrdinalIgnoreCase))
        {
            var hasAccess = subject.CreatedByUserId == currentUserId ||
                await _context.Set<TeacherSubjectAssignment>()
                    .AnyAsync(assignment => assignment.TeacherId == currentUserId && assignment.SubjectId == id);

            if (!hasAccess)
            {
                return null;
            }
        }
        else if (string.Equals(currentRole, "Student", StringComparison.OrdinalIgnoreCase) && currentUserId > 0)
        {
            var student = await _context.Users.FindAsync(currentUserId);
            if (student == null || !ClassAssignmentPolicy.CanAccessStudentContent(student, subject.Grade))
            {
                return null;
            }
        }

        return new SubjectDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Description = subject.Description,
            CreatedAt = subject.CreatedAt,
            Grade = subject.Grade,
            Section = subject.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(subject.Grade, subject.Section) ?? string.Empty,
            CreatedByUserId = subject.CreatedByUserId,
            CreatedByUsername = subject.CreatedByUser.Username,
            CreatedByFullName = subject.CreatedByUser.FullName,
            CreatedByIsApproved = subject.CreatedByUser.IsApproved
        };
    }

    /// <summary>
    /// Creates a new subject
    /// </summary>
    public async Task<SubjectDto> CreateAsync(CreateSubjectDto dto, int currentUserId)
    {
        // Validate input
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("Subject name is required");

        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new InvalidOperationException("Subject description is required");

        var classAssignment = ClassAssignmentPolicy.EnsureValidClass(dto.Grade, dto.Section);

        // Check for duplicate name
        if (await _context.Subjects.AnyAsync(s => s.Name == dto.Name && s.Grade == classAssignment.Grade && s.Section == classAssignment.Section))
            throw new InvalidOperationException("Subject with this name already exists");

        var subject = new Subject
        {
            Name = dto.Name,
            Description = dto.Description,
            CreatedAt = DateTime.UtcNow,
            Grade = classAssignment.Grade,
            Section = classAssignment.Section,
            CreatedByUserId = currentUserId
        };

        _context.Subjects.Add(subject);
        await _context.SaveChangesAsync();

        return new SubjectDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Description = subject.Description,
            CreatedAt = subject.CreatedAt,
            Grade = subject.Grade,
            Section = subject.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(subject.Grade, subject.Section) ?? string.Empty,
            CreatedByUserId = currentUserId,
            CreatedByIsApproved = true
        };
    }

    /// <summary>
    /// Updates an existing subject
    /// </summary>
    public async Task<SubjectDto> UpdateAsync(int id, UpdateSubjectDto dto, int currentUserId, string currentRole)
    {
        var subject = await _context.Subjects
            .Include(s => s.CreatedByUser)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (subject == null)
            throw new KeyNotFoundException($"Subject with ID {id} not found");

        EnsureCanManage(subject.CreatedByUserId, currentUserId, currentRole);

        // Validate input
        if (string.IsNullOrWhiteSpace(dto.Name))
            throw new InvalidOperationException("Subject name is required");

        if (string.IsNullOrWhiteSpace(dto.Description))
            throw new InvalidOperationException("Subject description is required");

        if (string.Equals(currentRole, "Teacher", StringComparison.OrdinalIgnoreCase))
        {
            subject.Description = dto.Description;
        }
        else
        {
            var classAssignment = ClassAssignmentPolicy.EnsureValidClass(dto.Grade, dto.Section);

            // Check for duplicate name (excluding current subject)
            if (await _context.Subjects.AnyAsync(s => s.Name == dto.Name && s.Grade == classAssignment.Grade && s.Section == classAssignment.Section && s.Id != id))
                throw new InvalidOperationException("Subject with this name already exists");

            subject.Name = dto.Name;
            subject.Description = dto.Description;
            subject.Grade = classAssignment.Grade;
            subject.Section = classAssignment.Section;
        }

        await _context.SaveChangesAsync();

        return new SubjectDto
        {
            Id = subject.Id,
            Name = subject.Name,
            Description = subject.Description,
            CreatedAt = subject.CreatedAt,
            Grade = subject.Grade,
            Section = subject.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(subject.Grade, subject.Section) ?? string.Empty,
            CreatedByUserId = subject.CreatedByUserId,
            CreatedByUsername = subject.CreatedByUser.Username,
            CreatedByFullName = subject.CreatedByUser.FullName,
            CreatedByIsApproved = subject.CreatedByUser.IsApproved
        };
    }

    /// <summary>
    /// Deletes a subject by ID
    /// </summary>
    public async Task DeleteAsync(int id, int currentUserId, string currentRole)
    {
        if (!string.Equals(currentRole, "Admin", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Only admins can delete subjects.");

        var subject = await _context.Subjects.FindAsync(id);

        if (subject == null)
            throw new KeyNotFoundException($"Subject with ID {id} not found");

        _context.Subjects.Remove(subject);
        await _context.SaveChangesAsync();
    }

    private static void EnsureCanManage(int createdByUserId, int currentUserId, string currentRole)
    {
        if (string.Equals(currentRole, "Admin", StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        if (createdByUserId != currentUserId)
        {
            throw new InvalidOperationException("You can only manage subjects you created.");
        }
    }
}

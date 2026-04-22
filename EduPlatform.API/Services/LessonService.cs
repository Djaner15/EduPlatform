using EduPlatform.API.Data;
using EduPlatform.API.DTOs;
using EduPlatform.API.Models;
using EduPlatform.API.Services.Interfaces;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.API.Services;

public class LessonService : ILessonService
{
    private readonly AppDbContext _context;
    private readonly IFileStorageService _fileStorageService;

    public LessonService(AppDbContext context, IFileStorageService fileStorageService)
    {
        _context = context;
        _fileStorageService = fileStorageService;
    }

    /// <summary>
    /// Gets all lessons with subject information
    /// </summary>
    public async Task<List<LessonDto>> GetAllAsync(int currentUserId, string currentRole, bool ignoreClassFilter = false)
    {
        var query = _context.Lessons
            .Include(l => l.Subject)
            .Include(l => l.CreatedByUser)
            .AsQueryable();

        if (!ignoreClassFilter &&
                 string.Equals(currentRole, "Student", StringComparison.OrdinalIgnoreCase) &&
                 currentUserId > 0)
        {
            var student = await _context.Users.FindAsync(currentUserId)
                ?? throw new InvalidOperationException("Student account not found.");

            if (!student.Grade.HasValue)
            {
                throw new InvalidOperationException("Student grade assignment is missing.");
            }

            query = query.Where(l => l.Grade >= 8 && l.Grade <= student.Grade.Value);
        }

        return await query.Select(l => new LessonDto
            {
                Id = l.Id,
                Title = l.Title,
                Content = l.Content,
                CreatedAt = l.CreatedAt,
                ImageUrl = l.ImageUrl,
                YoutubeUrl = l.YoutubeUrl,
                AttachmentUrl = l.AttachmentUrl,
                AttachmentName = l.AttachmentName,
                CreatedByUserId = l.CreatedByUserId,
                CreatedByUsername = l.CreatedByUser.Username,
                CreatedByFullName = l.CreatedByUser.FullName,
                CreatedByIsApproved = l.CreatedByUser.IsApproved,
                SubjectId = l.SubjectId,
                SubjectName = l.Subject!.Name,
                Grade = l.Grade,
                Section = l.Section,
                ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(l.Grade, l.Section) ?? string.Empty
            })
            .ToListAsync();
    }

    /// <summary>
    /// Gets a lesson by ID with subject information
    /// </summary>
    public async Task<LessonDto?> GetByIdAsync(int id, int currentUserId, string currentRole)
    {
        var lesson = await _context.Lessons
            .Include(l => l.Subject)
            .Include(l => l.CreatedByUser)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lesson == null)
            return null;

        if (string.Equals(currentRole, "Student", StringComparison.OrdinalIgnoreCase) && currentUserId > 0)
        {
            var student = await _context.Users.FindAsync(currentUserId);
            if (student == null || !ClassAssignmentPolicy.CanAccessStudentContent(student, lesson.Grade))
            {
                return null;
            }
        }

        return new LessonDto
        {
            Id = lesson.Id,
            Title = lesson.Title,
            Content = lesson.Content,
            CreatedAt = lesson.CreatedAt,
            ImageUrl = lesson.ImageUrl,
            YoutubeUrl = lesson.YoutubeUrl,
            AttachmentUrl = lesson.AttachmentUrl,
            AttachmentName = lesson.AttachmentName,
            CreatedByUserId = lesson.CreatedByUserId,
            CreatedByUsername = lesson.CreatedByUser.Username,
            CreatedByFullName = lesson.CreatedByUser.FullName,
            CreatedByIsApproved = lesson.CreatedByUser.IsApproved,
            SubjectId = lesson.SubjectId,
            SubjectName = lesson.Subject!.Name,
            Grade = lesson.Grade,
            Section = lesson.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(lesson.Grade, lesson.Section) ?? string.Empty
        };
    }

    /// <summary>
    /// Gets all lessons for a specific subject
    /// </summary>
    public async Task<List<LessonDto>> GetBySubjectIdAsync(int subjectId, int currentUserId, string currentRole, bool ignoreClassFilter = false)
    {
        // Verify subject exists
        var subject = await _context.Subjects.FindAsync(subjectId);
        if (subject == null)
            throw new KeyNotFoundException($"Subject with ID {subjectId} not found");

        var query = _context.Lessons
            .Include(l => l.Subject)
            .Include(l => l.CreatedByUser)
            .Where(l => l.SubjectId == subjectId);

        if (!ignoreClassFilter &&
                 string.Equals(currentRole, "Student", StringComparison.OrdinalIgnoreCase) &&
                 currentUserId > 0)
        {
            var student = await _context.Users.FindAsync(currentUserId)
                ?? throw new InvalidOperationException("Student account not found.");

            if (!student.Grade.HasValue)
            {
                throw new InvalidOperationException("Student grade assignment is missing.");
            }

            query = query.Where(l => l.Grade >= 8 && l.Grade <= student.Grade.Value);
        }

        return await query.Select(l => new LessonDto
            {
                Id = l.Id,
                Title = l.Title,
                Content = l.Content,
                CreatedAt = l.CreatedAt,
                ImageUrl = l.ImageUrl,
                YoutubeUrl = l.YoutubeUrl,
                AttachmentUrl = l.AttachmentUrl,
                AttachmentName = l.AttachmentName,
                CreatedByUserId = l.CreatedByUserId,
                CreatedByUsername = l.CreatedByUser.Username,
                CreatedByFullName = l.CreatedByUser.FullName,
                CreatedByIsApproved = l.CreatedByUser.IsApproved,
                SubjectId = l.SubjectId,
                SubjectName = l.Subject!.Name,
                Grade = l.Grade,
                Section = l.Section,
                ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(l.Grade, l.Section) ?? string.Empty
            })
            .ToListAsync();
    }

    /// <summary>
    /// Creates a new lesson
    /// </summary>
    public async Task<LessonDto> CreateAsync(LessonUpsertDto dto, IFormFile? image, IFormFile? attachment, int currentUserId)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Lesson title is required");

        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new InvalidOperationException("Lesson content is required");

        // Verify subject exists
        var subject = await _context.Subjects.FindAsync(dto.SubjectId);
        if (subject == null)
            throw new InvalidOperationException("Subject not found");

        var classAssignment = ClassAssignmentPolicy.EnsureValidClass(dto.Grade, dto.Section);

        if (subject.Grade != classAssignment.Grade || subject.Section != classAssignment.Section)
            throw new InvalidOperationException("Lesson class must match the selected subject class.");

        var lesson = new Lesson
        {
            Title = dto.Title.Trim(),
            Content = dto.Content,
            CreatedAt = DateTime.UtcNow,
            YoutubeUrl = string.IsNullOrWhiteSpace(dto.YoutubeUrl) ? null : dto.YoutubeUrl.Trim(),
            ImageUrl = await _fileStorageService.SaveFileAsync(image, "lesson-images", ".png", ".jpg", ".jpeg", ".webp"),
            AttachmentUrl = await _fileStorageService.SaveFileAsync(attachment, "lesson-attachments", ".pdf"),
            AttachmentName = attachment?.FileName,
            CreatedByUserId = currentUserId,
            SubjectId = dto.SubjectId,
            Grade = classAssignment.Grade,
            Section = classAssignment.Section
        };

        _context.Lessons.Add(lesson);
        await _context.SaveChangesAsync();

        // Reload with relations
        await _context.Entry(lesson).Reference(l => l.Subject).LoadAsync();

        await _context.Entry(lesson).Reference(l => l.CreatedByUser).LoadAsync();

        return new LessonDto
        {
            Id = lesson.Id,
            Title = lesson.Title,
            Content = lesson.Content,
            CreatedAt = lesson.CreatedAt,
            ImageUrl = lesson.ImageUrl,
            YoutubeUrl = lesson.YoutubeUrl,
            AttachmentUrl = lesson.AttachmentUrl,
            AttachmentName = lesson.AttachmentName,
            CreatedByUserId = lesson.CreatedByUserId,
            CreatedByUsername = lesson.CreatedByUser.Username,
            CreatedByFullName = lesson.CreatedByUser.FullName,
            CreatedByIsApproved = lesson.CreatedByUser.IsApproved,
            SubjectId = lesson.SubjectId,
            SubjectName = lesson.Subject!.Name,
            Grade = lesson.Grade,
            Section = lesson.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(lesson.Grade, lesson.Section) ?? string.Empty
        };
    }

    /// <summary>
    /// Updates an existing lesson
    /// </summary>
    public async Task<LessonDto> UpdateAsync(int id, LessonUpsertDto dto, IFormFile? image, IFormFile? attachment, int currentUserId, string currentRole)
    {
        var lesson = await _context.Lessons
            .Include(l => l.Subject)
            .Include(l => l.CreatedByUser)
            .FirstOrDefaultAsync(l => l.Id == id);

        if (lesson == null)
            throw new KeyNotFoundException($"Lesson with ID {id} not found");

        EnsureCanManage(lesson.CreatedByUserId, currentUserId, currentRole);

        // Validate input
        if (string.IsNullOrWhiteSpace(dto.Title))
            throw new InvalidOperationException("Lesson title is required");

        if (string.IsNullOrWhiteSpace(dto.Content))
            throw new InvalidOperationException("Lesson content is required");

        // Verify subject exists if changed
        if (dto.SubjectId != lesson.SubjectId)
        {
            var subjectToValidate = await _context.Subjects.FindAsync(dto.SubjectId);
            if (subjectToValidate == null)
                throw new InvalidOperationException("Subject not found");
        }

        var classAssignment = ClassAssignmentPolicy.EnsureValidClass(dto.Grade, dto.Section);

        var subject = await _context.Subjects.FindAsync(dto.SubjectId);
        if (subject == null)
            throw new InvalidOperationException("Subject not found");

        if (subject.Grade != classAssignment.Grade || subject.Section != classAssignment.Section)
            throw new InvalidOperationException("Lesson class must match the selected subject class.");

        lesson.Title = dto.Title.Trim();
        lesson.Content = dto.Content;
        lesson.YoutubeUrl = string.IsNullOrWhiteSpace(dto.YoutubeUrl) ? null : dto.YoutubeUrl.Trim();
        lesson.SubjectId = dto.SubjectId;
        lesson.Subject = subject;
        lesson.Grade = classAssignment.Grade;
        lesson.Section = classAssignment.Section;

        if (image != null)
        {
            await _fileStorageService.DeleteFileIfExistsAsync(lesson.ImageUrl);
            lesson.ImageUrl = await _fileStorageService.SaveFileAsync(image, "lesson-images", ".png", ".jpg", ".jpeg", ".webp");
        }

        if (attachment != null)
        {
            await _fileStorageService.DeleteFileIfExistsAsync(lesson.AttachmentUrl);
            lesson.AttachmentUrl = await _fileStorageService.SaveFileAsync(attachment, "lesson-attachments", ".pdf");
            lesson.AttachmentName = attachment.FileName;
        }

        await _context.SaveChangesAsync();

        return new LessonDto
        {
            Id = lesson.Id,
            Title = lesson.Title,
            Content = lesson.Content,
            CreatedAt = lesson.CreatedAt,
            ImageUrl = lesson.ImageUrl,
            YoutubeUrl = lesson.YoutubeUrl,
            AttachmentUrl = lesson.AttachmentUrl,
            AttachmentName = lesson.AttachmentName,
            CreatedByUserId = lesson.CreatedByUserId,
            CreatedByUsername = lesson.CreatedByUser.Username,
            CreatedByFullName = lesson.CreatedByUser.FullName,
            CreatedByIsApproved = lesson.CreatedByUser.IsApproved,
            SubjectId = lesson.SubjectId,
            SubjectName = lesson.Subject!.Name,
            Grade = lesson.Grade,
            Section = lesson.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(lesson.Grade, lesson.Section) ?? string.Empty
        };
    }

    /// <summary>
    /// Deletes a lesson by ID
    /// </summary>
    public async Task DeleteAsync(int id, int currentUserId, string currentRole)
    {
        var lesson = await _context.Lessons.FindAsync(id);

        if (lesson == null)
            throw new KeyNotFoundException($"Lesson with ID {id} not found");

        EnsureCanManage(lesson.CreatedByUserId, currentUserId, currentRole);

        await _fileStorageService.DeleteFileIfExistsAsync(lesson.ImageUrl);
        await _fileStorageService.DeleteFileIfExistsAsync(lesson.AttachmentUrl);
        _context.Lessons.Remove(lesson);
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
            throw new InvalidOperationException("You can only manage lessons you created.");
        }
    }
}

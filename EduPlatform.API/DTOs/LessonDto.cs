using Microsoft.AspNetCore.Http;

namespace EduPlatform.API.DTOs;

public class LessonDto
{
    public int Id { get; set; }
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public string? ImageUrl { get; set; }
    public string? YoutubeUrl { get; set; }
    public string? AttachmentUrl { get; set; }
    public string? AttachmentName { get; set; }
    public int CreatedByUserId { get; set; }
    public string? CreatedByUsername { get; set; }
    public string? CreatedByFullName { get; set; }
    public bool CreatedByIsApproved { get; set; }
    public int SubjectId { get; set; }
    public string SubjectName { get; set; } = null!;
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
    public string ClassDisplay { get; set; } = null!;
}

public class LessonUpsertDto
{
    public string Title { get; set; } = null!;
    public string Content { get; set; } = null!;
    public string? YoutubeUrl { get; set; }
    public int SubjectId { get; set; }
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
}

public class LessonUpsertFormDto
{
    public string Payload { get; set; } = "{}";
    public IFormFile? Image { get; set; }
    public IFormFile? Attachment { get; set; }
}

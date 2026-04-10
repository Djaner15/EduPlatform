namespace EduPlatform.API.DTOs;

public class SubjectDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
    public string ClassDisplay { get; set; } = null!;
    public int CreatedByUserId { get; set; }
    public string? CreatedByUsername { get; set; }
    public string? CreatedByFullName { get; set; }
    public bool CreatedByIsApproved { get; set; }
}

public class CreateSubjectDto
{
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
}

public class UpdateSubjectDto
{
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
    public int Grade { get; set; }
    public string Section { get; set; } = null!;
}

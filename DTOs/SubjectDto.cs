namespace EduPlatform.API.DTOs;

public class SubjectDto
{
    public int Id { get; set; }
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
}

public class CreateSubjectDto
{
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
}

public class UpdateSubjectDto
{
    public string Name { get; set; } = null!;
    public string Description { get; set; } = null!;
}

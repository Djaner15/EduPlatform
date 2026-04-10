namespace EduPlatform.API.DTOs.Auth;

public class BulkUserImportDto
{
    public List<BulkUserImportRowDto> Users { get; set; } = new();
}

public class BulkUserImportRowDto
{
    public string Role { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string Email { get; set; } = null!;
    public string Password { get; set; } = null!;
    public string? Subjects { get; set; }
    public int? Grade { get; set; }
    public string? Section { get; set; }
}

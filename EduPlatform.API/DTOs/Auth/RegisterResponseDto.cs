namespace EduPlatform.API.DTOs.Auth;

public class RegisterResponseDto
{
    public string Message { get; set; } = null!;
    public bool RequiresApproval { get; set; }
}

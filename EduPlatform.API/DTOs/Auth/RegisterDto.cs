namespace EduPlatform.API.DTOs.Auth
{
    public class RegisterDto
    {
        public string FullName { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Password { get; set; } = null!;
        public int Grade { get; set; }
        public string Section { get; set; } = null!;
    }
}

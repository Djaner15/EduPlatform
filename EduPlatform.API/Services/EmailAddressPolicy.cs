namespace EduPlatform.API.Services;

public static class EmailAddressPolicy
{
    public static bool IsReservedPlatformEmail(IConfiguration configuration, string? email)
    {
        if (string.IsNullOrWhiteSpace(email))
        {
            return false;
        }

        var normalizedEmail = Normalize(email);

        var reservedEmails = new[]
        {
            configuration["Email:Username"],
            configuration["Email:From"],
            configuration["Email:ReplyTo"],
            "eduplatform.support@gmail.com",
            "no-reply@eduplatform.com"
        };

        return reservedEmails
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => Normalize(value!))
            .Contains(normalizedEmail, StringComparer.OrdinalIgnoreCase);
    }

    public static string Normalize(string email)
    {
        return email.Trim().ToLowerInvariant();
    }
}

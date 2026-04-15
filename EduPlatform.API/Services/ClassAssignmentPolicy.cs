using EduPlatform.API.Models;

namespace EduPlatform.API.Services;

public static class ClassAssignmentPolicy
{
    private static readonly HashSet<string> ValidSections = new(StringComparer.Ordinal)
    {
        "А", "Б", "В", "Г", "Д", "Е", "Ж", "З"
    };

    public static (int Grade, string Section) EnsureValidClass(int grade, string? section)
    {
        if (grade < 8 || grade > 12)
        {
            throw new InvalidOperationException("Grade must be between 8 and 12.");
        }

        var normalizedSection = NormalizeSection(section);

        if (normalizedSection is null)
        {
            throw new InvalidOperationException("Section must be one of: А, Б, В, Г, Д, Е, Ж, З.");
        }

        return (grade, normalizedSection);
    }

    public static (int? Grade, string? Section) EnsureUserClassForRole(string roleName, int? grade, string? section)
    {
        if (string.Equals(roleName, "Student", StringComparison.OrdinalIgnoreCase))
        {
            if (!grade.HasValue)
            {
                throw new InvalidOperationException("Student accounts must have a grade.");
            }

            var validClass = EnsureValidClass(grade.Value, section);
            return (validClass.Grade, validClass.Section);
        }

        return (null, null);
    }

    public static string? NormalizeSection(string? section)
    {
        if (string.IsNullOrWhiteSpace(section))
        {
            return null;
        }

        var normalized = section.Trim().ToUpperInvariant();

        return ValidSections.Contains(normalized) ? normalized : null;
    }

    public static string? FormatClassDisplay(int? grade, string? section)
    {
        var normalizedSection = NormalizeSection(section);

        if (!grade.HasValue || normalizedSection is null)
        {
            return null;
        }

        return $"{grade.Value}{normalizedSection}";
    }

    public static bool Matches(User user, int grade, string section)
    {
        if (user.Grade != grade)
        {
            return false;
        }

        var normalizedLessonSection = NormalizeSection(section);
        if (normalizedLessonSection is null)
        {
            return true;
        }

        var normalizedUserSection = NormalizeSection(user.Section);
        return normalizedUserSection is not null &&
               string.Equals(normalizedUserSection, normalizedLessonSection, StringComparison.OrdinalIgnoreCase);
    }
}

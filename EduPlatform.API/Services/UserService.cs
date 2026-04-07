using Microsoft.EntityFrameworkCore;
using BCrypt.Net;
using EduPlatform.API.Data;
using EduPlatform.API.Models;
using EduPlatform.API.Services.Interfaces;
using EduPlatform.API.DTOs.Auth;

namespace EduPlatform.API.Services;

public class UserService
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;

    public UserService(AppDbContext context, IEmailService emailService, IConfiguration configuration)
    {
        _context = context;
        _emailService = emailService;
        _configuration = configuration;
    }

    /// <summary>
    /// Gets all users with their role information
    /// </summary>
    public async Task<List<User>> GetAllAsync()
    {
        return await _context.Users
            .Include(u => u.Role)
            .Include(u => u.TeacherSubjectAssignments)
                .ThenInclude(ts => ts.Subject)
            .Include(u => u.TeacherClassAssignments)
                .ThenInclude(tc => tc.ClassSection)
            .Include(u => u.SupervisedClassSections)
            .ToListAsync();
    }

    /// <summary>
    /// Gets a user by ID with role information
    /// </summary>
    public async Task<User?> GetByIdAsync(int id)
    {
        return await _context.Users
            .Include(u => u.Role)
            .Include(u => u.TeacherSubjectAssignments)
                .ThenInclude(ts => ts.Subject)
            .Include(u => u.TeacherClassAssignments)
                .ThenInclude(tc => tc.ClassSection)
            .Include(u => u.SupervisedClassSections)
            .FirstOrDefaultAsync(u => u.Id == id);
    }

    /// <summary>
    /// Creates a new user with validation
    /// </summary>
    public async Task<User> CreateAsync(
        string fullName,
        string username,
        string email,
        string password,
        int roleId,
        int? grade,
        string? section,
        IReadOnlyCollection<int>? subjectIds = null,
        IReadOnlyCollection<AssignedClassDto>? assignedClasses = null)
    {
        var normalizedEmail = EmailAddressPolicy.Normalize(email);
        var normalizedFullName = fullName.Trim();

        if (string.IsNullOrWhiteSpace(normalizedFullName))
            throw new InvalidOperationException("Full name is required");

        // Validate username uniqueness
        if (await _context.Users.AnyAsync(u => u.Username == username))
            throw new InvalidOperationException("Username already exists");

        if (EmailAddressPolicy.IsReservedPlatformEmail(_configuration, normalizedEmail))
            throw new InvalidOperationException("This email address is reserved for platform communication and cannot be used for user accounts.");

        // Validate email uniqueness
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail))
            throw new InvalidOperationException("User with this email already exists");

        // Validate role exists
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == roleId);
        if (role == null)
            throw new InvalidOperationException("Role does not exist");

        PasswordPolicy.EnsureValid(password);
        var classAssignment = ClassAssignmentPolicy.EnsureUserClassForRole(role.Name, grade, section);

        var user = new User
        {
            FullName = normalizedFullName,
            Username = username,
            Email = normalizedEmail,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(password),
            RoleId = roleId,
            Grade = classAssignment.Grade,
            Section = classAssignment.Section,
            IsApproved = true,
            ApprovedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        await SyncTeacherAssignmentsAsync(user, role.Name, subjectIds, assignedClasses);
        await _context.SaveChangesAsync();

        await _emailService.SendAccountCreatedByAdminAsync(user.Email, user.Username, role.Name, password);

        return await GetByIdAsync(user.Id) ?? user;
    }

    public async Task<int> BulkCreateStudentsAsync(IReadOnlyCollection<BulkStudentImportStudentDto> students)
    {
        if (students.Count == 0)
            throw new InvalidOperationException("Не са подадени ученици за импорт.");

        var studentRole = await _context.Roles.FirstOrDefaultAsync(role => role.Name == "Student");
        if (studentRole == null)
            throw new InvalidOperationException("Ролята за ученик не беше намерена.");

        var normalizedRows = students
            .Select((student, index) => new
            {
                Index = index + 1,
                Username = student.Username.Trim(),
                FullName = student.FullName.Trim(),
                Email = EmailAddressPolicy.Normalize(student.Email),
                Password = student.Password,
                ClassAssignment = ClassAssignmentPolicy.EnsureValidClass(student.Grade, student.Section)
            })
            .ToList();

        foreach (var row in normalizedRows)
        {
            if (string.IsNullOrWhiteSpace(row.FullName))
                throw new InvalidOperationException($"Ред {row.Index}: липсва пълно име.");

            if (string.IsNullOrWhiteSpace(row.Username))
                throw new InvalidOperationException($"Ред {row.Index}: липсва потребителско име.");

            if (string.IsNullOrWhiteSpace(row.Email))
                throw new InvalidOperationException($"Ред {row.Index}: липсва имейл адрес.");

            if (string.IsNullOrWhiteSpace(row.Password))
                throw new InvalidOperationException($"Ред {row.Index}: липсва парола.");

            if (EmailAddressPolicy.IsReservedPlatformEmail(_configuration, row.Email))
                throw new InvalidOperationException($"Ред {row.Index}: този имейл е запазен за служебна комуникация.");

            try
            {
                PasswordPolicy.EnsureValid(row.Password);
            }
            catch (InvalidOperationException)
            {
                throw new InvalidOperationException(
                    $"Ред {row.Index}: паролата трябва да е поне 8 символа и да съдържа главна буква, малка буква, цифра и специален символ.");
            }
        }

        var duplicateUsername = normalizedRows
            .GroupBy(row => row.Username, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(group => group.Count() > 1);

        if (duplicateUsername != null)
            throw new InvalidOperationException($"Има дублирано потребителско име във файла: {duplicateUsername.Key}");

        var duplicateEmail = normalizedRows
            .GroupBy(row => row.Email, StringComparer.OrdinalIgnoreCase)
            .FirstOrDefault(group => group.Count() > 1);

        if (duplicateEmail != null)
            throw new InvalidOperationException($"Има дублиран имейл във файла: {duplicateEmail.Key}");

        var usernames = normalizedRows.Select(row => row.Username).ToList();
        var emails = normalizedRows.Select(row => row.Email).ToList();

        var existingUsernames = await _context.Users
            .Where(user => usernames.Contains(user.Username))
            .Select(user => user.Username)
            .ToListAsync();

        if (existingUsernames.Count > 0)
            throw new InvalidOperationException($"Потребителското име вече съществува: {existingUsernames[0]}");

        var existingEmails = await _context.Users
            .Where(user => emails.Contains(user.Email.ToLower()))
            .Select(user => user.Email)
            .ToListAsync();

        if (existingEmails.Count > 0)
            throw new InvalidOperationException($"Имейлът вече съществува: {existingEmails[0]}");

        foreach (var row in normalizedRows)
        {
            await CreateAsync(
                row.FullName,
                row.Username,
                row.Email,
                row.Password,
                studentRole.Id,
                row.ClassAssignment.Grade,
                row.ClassAssignment.Section);
        }

        return normalizedRows.Count;
    }

    public async Task<User> SetApprovalAsync(int id, bool isApproved)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == id);

        if (user == null)
            throw new InvalidOperationException("User not found");

        user.IsApproved = isApproved;
        user.ApprovedAt = isApproved ? DateTime.UtcNow : null;

        await _context.SaveChangesAsync();

        if (isApproved)
        {
            await _emailService.SendApprovalGrantedAsync(user.Email, user.Username);
        }
        else
        {
            await _emailService.SendApprovalRevokedAsync(user.Email, user.Username);
        }

        return user;
    }

    /// <summary>
    /// Updates a user with validation
    /// </summary>
    public async Task<User> UpdateAsync(
        int id,
        string fullName,
        string username,
        string email,
        int roleId,
        int? grade,
        string? section,
        string? password = null,
        IReadOnlyCollection<int>? subjectIds = null,
        IReadOnlyCollection<AssignedClassDto>? assignedClasses = null)
    {
        var user = await _context.Users
            .Include(u => u.TeacherSubjectAssignments)
            .Include(u => u.TeacherClassAssignments)
            .Include(u => u.SupervisedClassSections)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new InvalidOperationException("User not found");

        var normalizedEmail = EmailAddressPolicy.Normalize(email);
        var normalizedFullName = fullName.Trim();

        if (string.IsNullOrWhiteSpace(normalizedFullName))
            throw new InvalidOperationException("Full name is required");

        // Validate username uniqueness
        if (await _context.Users.AnyAsync(u => u.Username == username && u.Id != id))
            throw new InvalidOperationException("Username already exists");

        if (EmailAddressPolicy.IsReservedPlatformEmail(_configuration, normalizedEmail))
            throw new InvalidOperationException("This email address is reserved for platform communication and cannot be used for user accounts.");

        // Validate email uniqueness
        if (await _context.Users.AnyAsync(u => u.Email.ToLower() == normalizedEmail && u.Id != id))
            throw new InvalidOperationException("Email already exists");

        // Validate role
        var role = await _context.Roles.FirstOrDefaultAsync(r => r.Id == roleId);
        if (role == null)
            throw new InvalidOperationException("Invalid role");

        var classAssignment = ClassAssignmentPolicy.EnsureUserClassForRole(role.Name, grade, section);

        user.FullName = normalizedFullName;
        user.Username = username;
        user.Email = normalizedEmail;
        user.RoleId = roleId;
        user.Grade = classAssignment.Grade;
        user.Section = classAssignment.Section;

        if (!string.IsNullOrWhiteSpace(password))
        {
            PasswordPolicy.EnsureValid(password);
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(password);
        }

        await SyncTeacherAssignmentsAsync(user, role.Name, subjectIds, assignedClasses);
        await _context.SaveChangesAsync();
        return await GetByIdAsync(user.Id) ?? user;
    }

    /// <summary>
    /// Deletes a user by ID
    /// </summary>
    public async Task DeleteAsync(int id)
    {
        var user = await _context.Users
            .Include(u => u.Role)
            .Include(u => u.TeacherSubjectAssignments)
            .Include(u => u.TeacherClassAssignments)
            .Include(u => u.SupervisedClassSections)
            .FirstOrDefaultAsync(u => u.Id == id);
        if (user == null)
            throw new InvalidOperationException("User not found");

        if (user.Role?.Name == "Admin")
            throw new InvalidOperationException("Admin users cannot be deleted");

        var email = user.Email;
        var username = user.Username;

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        await _emailService.SendAccountRemovedAsync(email, username);
    }

    public async Task SetClassTeacherAsync(int grade, string section, int? teacherId)
    {
        var classAssignment = ClassAssignmentPolicy.EnsureValidClass(grade, section);
        var classSection = await GetOrCreateClassSectionAsync(classAssignment.Grade, classAssignment.Section);

        if (teacherId.HasValue)
        {
            var teacher = await _context.Users
                .Include(u => u.Role)
                .Include(u => u.TeacherClassAssignments)
                .FirstOrDefaultAsync(u => u.Id == teacherId.Value);

            if (teacher == null || teacher.Role?.Name != "Teacher")
                throw new InvalidOperationException("Class teacher must be an existing teacher.");

            if (!teacher.TeacherClassAssignments.Any(tc => tc.ClassSectionId == classSection.Id))
            {
                teacher.TeacherClassAssignments.Add(new TeacherClassAssignment
                {
                    TeacherId = teacher.Id,
                    ClassSectionId = classSection.Id
                });
            }

            classSection.ClassTeacherId = teacher.Id;
        }
        else
        {
            classSection.ClassTeacherId = null;
        }

        await _context.SaveChangesAsync();
    }

    private async Task SyncTeacherAssignmentsAsync(
        User user,
        string roleName,
        IReadOnlyCollection<int>? subjectIds,
        IReadOnlyCollection<AssignedClassDto>? assignedClasses)
    {
        if (!string.Equals(roleName, "Teacher", StringComparison.OrdinalIgnoreCase))
        {
            if (user.TeacherSubjectAssignments.Any())
            {
                _context.TeacherSubjectAssignments.RemoveRange(user.TeacherSubjectAssignments);
            }

            if (user.TeacherClassAssignments.Any())
            {
                _context.TeacherClassAssignments.RemoveRange(user.TeacherClassAssignments);
            }

            foreach (var supervisedSection in user.SupervisedClassSections)
            {
                supervisedSection.ClassTeacherId = null;
            }

            return;
        }

        var normalizedSubjectIds = (subjectIds ?? Array.Empty<int>())
            .Distinct()
            .ToArray();

        var existingSubjects = await _context.Subjects
            .Where(subject => normalizedSubjectIds.Contains(subject.Id))
            .Select(subject => subject.Id)
            .ToListAsync();

        if (existingSubjects.Count != normalizedSubjectIds.Length)
        {
            throw new InvalidOperationException("One or more selected subjects were not found.");
        }

        var desiredClasses = (assignedClasses ?? Array.Empty<AssignedClassDto>())
            .Select(entry => ClassAssignmentPolicy.EnsureValidClass(entry.Grade, entry.Section))
            .Distinct()
            .ToList();

        var existingSubjectAssignments = user.TeacherSubjectAssignments.ToList();
        foreach (var assignment in existingSubjectAssignments.Where(assignment => !normalizedSubjectIds.Contains(assignment.SubjectId)))
        {
            _context.TeacherSubjectAssignments.Remove(assignment);
        }

        foreach (var subjectId in normalizedSubjectIds.Where(subjectId => existingSubjectAssignments.All(assignment => assignment.SubjectId != subjectId)))
        {
            _context.TeacherSubjectAssignments.Add(new TeacherSubjectAssignment
            {
                TeacherId = user.Id,
                SubjectId = subjectId
            });
        }

        var classSections = new List<ClassSection>();
        foreach (var desiredClass in desiredClasses)
        {
            classSections.Add(await GetOrCreateClassSectionAsync(desiredClass.Grade, desiredClass.Section));
        }

        var existingClassAssignments = user.TeacherClassAssignments.ToList();
        foreach (var assignment in existingClassAssignments.Where(assignment => classSections.All(section => section.Id != assignment.ClassSectionId)))
        {
            _context.TeacherClassAssignments.Remove(assignment);
        }

        foreach (var classSection in classSections.Where(classSection => existingClassAssignments.All(assignment => assignment.ClassSectionId != classSection.Id)))
        {
            _context.TeacherClassAssignments.Add(new TeacherClassAssignment
            {
                TeacherId = user.Id,
                ClassSectionId = classSection.Id
            });
        }
    }

    private async Task<ClassSection> GetOrCreateClassSectionAsync(int grade, string section)
    {
        var normalizedSection = ClassAssignmentPolicy.EnsureValidClass(grade, section).Section;
        var classSection = await _context.ClassSections
            .FirstOrDefaultAsync(entry => entry.Grade == grade && entry.Section == normalizedSection);

        if (classSection != null)
        {
            return classSection;
        }

        classSection = new ClassSection
        {
            Grade = grade,
            Section = normalizedSection
        };

        _context.ClassSections.Add(classSection);
        await _context.SaveChangesAsync();
        return classSection;
    }
}

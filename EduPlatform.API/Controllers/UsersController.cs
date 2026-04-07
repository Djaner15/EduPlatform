using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EduPlatform.API.Services;
using EduPlatform.API.DTOs.Auth;
using EduPlatform.API.Data;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class UsersController : ControllerBase
{
    private readonly UserService _userService;
    private readonly AppDbContext _context;

    public UsersController(UserService userService, AppDbContext context)
    {
        _userService = userService;
        _context = context;
    }

    /// <summary>
    /// Gets all users with their role information
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userService.GetAllAsync();
        
        var result = users.Select(u => new
        {
            u.Id,
            u.FullName,
            u.Username,
            u.Email,
            Role = u.Role!.Name,
            u.Grade,
            u.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(u.Grade, u.Section),
            SubjectIds = u.TeacherSubjectAssignments.Select(ts => ts.SubjectId).ToList(),
            AssignedClasses = u.TeacherClassAssignments
                .Select(tc => new { tc.ClassSection.Grade, tc.ClassSection.Section, ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(tc.ClassSection.Grade, tc.ClassSection.Section) })
                .OrderBy(tc => tc.Grade)
                .ThenBy(tc => tc.Section)
                .ToList(),
            u.IsApproved,
            u.ApprovedAt
        }).ToList();

        return Ok(result);
    }

    /// <summary>
    /// Gets a specific user by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetUser(int id)
    {
        var user = await _userService.GetByIdAsync(id);

        if (user == null)
            return NotFound();

        return Ok(new
        {
            user.Id,
            user.FullName,
            user.Username,
            user.Email,
            Role = user.Role!.Name,
            user.Grade,
            user.Section,
            ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(user.Grade, user.Section),
            SubjectIds = user.TeacherSubjectAssignments.Select(ts => ts.SubjectId).ToList(),
            AssignedClasses = user.TeacherClassAssignments
                .Select(tc => new { tc.ClassSection.Grade, tc.ClassSection.Section, ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(tc.ClassSection.Grade, tc.ClassSection.Section) })
                .OrderBy(tc => tc.Grade)
                .ThenBy(tc => tc.Section)
                .ToList(),
            user.IsApproved,
            user.ApprovedAt
        });
    }

    /// <summary>
    /// Creates a new user
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        try
        {
            var user = await _userService.CreateAsync(dto.FullName, dto.Username, dto.Email, dto.Password, dto.RoleId, dto.Grade, dto.Section, dto.SubjectIds, dto.AssignedClasses);
            
            return CreatedAtAction(nameof(GetUser), new { id = user.Id }, new
            {
                user.Id,
                user.FullName,
                user.Username,
                user.Email,
                Role = user.Role!.Name,
                user.Grade,
                user.Section,
                ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(user.Grade, user.Section),
                SubjectIds = user.TeacherSubjectAssignments.Select(ts => ts.SubjectId).ToList(),
                AssignedClasses = user.TeacherClassAssignments
                    .Select(tc => new { tc.ClassSection.Grade, tc.ClassSection.Section, ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(tc.ClassSection.Grade, tc.ClassSection.Section) })
                    .OrderBy(tc => tc.Grade)
                    .ThenBy(tc => tc.Section)
                    .ToList(),
                user.IsApproved,
                user.ApprovedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("bulk-students")]
    public async Task<IActionResult> BulkCreateStudents([FromBody] BulkStudentImportDto dto)
    {
        try
        {
            var createdCount = await _userService.BulkCreateStudentsAsync(dto.Students);
            return Ok(new { createdCount });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("{id}/approval")]
    public async Task<IActionResult> SetApproval(int id, [FromBody] ApproveUserDto dto)
    {
        try
        {
            var user = await _userService.SetApprovalAsync(id, dto.IsApproved);
            return Ok(new
            {
                user.Id,
                user.FullName,
                user.Username,
                user.Email,
                Role = user.Role!.Name,
                user.Grade,
                user.Section,
                ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(user.Grade, user.Section),
                SubjectIds = user.TeacherSubjectAssignments.Select(ts => ts.SubjectId).ToList(),
                AssignedClasses = user.TeacherClassAssignments
                    .Select(tc => new { tc.ClassSection.Grade, tc.ClassSection.Section, ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(tc.ClassSection.Grade, tc.ClassSection.Section) })
                    .OrderBy(tc => tc.Grade)
                    .ThenBy(tc => tc.Section)
                    .ToList(),
                user.IsApproved,
                user.ApprovedAt
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Updates a user's information
    /// </summary>
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserDto dto)
    {
        try
        {
            await _userService.UpdateAsync(id, dto.FullName, dto.Username, dto.Email, dto.RoleId, dto.Grade, dto.Section, dto.Password, dto.SubjectIds, dto.AssignedClasses);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("management")]
    public async Task<IActionResult> GetManagementData()
    {
        var users = await _userService.GetAllAsync();
        var subjects = await _context.Subjects
            .OrderBy(subject => subject.Name)
            .ThenBy(subject => subject.Grade)
            .ThenBy(subject => subject.Section)
            .ToListAsync();
        var classSections = await _context.ClassSections
            .Include(section => section.ClassTeacher)
            .OrderBy(section => section.Grade)
            .ThenBy(section => section.Section)
            .ToListAsync();

        var teachers = users
            .Where(user => user.Role?.Name == "Teacher")
            .Select(user => new
            {
                user.Id,
                user.FullName,
                user.Username,
                user.Email,
                user.IsApproved,
                SubjectIds = user.TeacherSubjectAssignments.Select(ts => ts.SubjectId).ToList(),
                SubjectNames = user.TeacherSubjectAssignments
                    .Select(ts => ts.Subject.Name)
                    .Distinct()
                    .OrderBy(name => name)
                    .ToList(),
                AssignedClasses = user.TeacherClassAssignments
                    .Select(tc => new
                    {
                        tc.ClassSection.Grade,
                        tc.ClassSection.Section,
                        ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(tc.ClassSection.Grade, tc.ClassSection.Section)
                    })
                    .OrderBy(tc => tc.Grade)
                    .ThenBy(tc => tc.Section)
                    .ToList()
            })
            .OrderBy(teacher => teacher.Username)
            .ToList();

        var admins = users
            .Where(user => user.Role?.Name == "Admin")
            .Select(user => new
            {
                user.Id,
                user.FullName,
                user.Username,
                user.Email,
                Role = "Admin",
                user.IsApproved
            })
            .OrderBy(admin => admin.Username)
            .ToList();

        var studentHierarchy = users
            .Where(user => user.Role?.Name == "Student")
            .GroupBy(user => user.Grade)
            .Where(group => group.Key.HasValue)
            .OrderBy(group => group.Key)
            .Select(group => new
            {
                Grade = group.Key!.Value,
                Sections = classSections
                    .Where(section => section.Grade == group.Key.Value)
                    .Select(section => new
                    {
                        section.Section,
                        ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(section.Grade, section.Section),
                        ClassTeacher = section.ClassTeacherId.HasValue
                            ? teachers.FirstOrDefault(teacher => teacher.Id == section.ClassTeacherId.Value)
                            : null,
                        Students = group
                            .Where(student => student.Section == section.Section)
                            .OrderBy(student => student.Username)
                            .Select(student => new
                            {
                                student.Id,
                                student.FullName,
                                student.Username,
                                student.Email,
                                Role = student.Role!.Name,
                                student.IsApproved
                            })
                            .ToList()
                    })
                    .Where(section => section.Students.Count > 0 || section.ClassTeacher != null)
                    .OrderBy(section => section.Section)
                    .ToList()
            })
            .ToList();

        var availableClasses = classSections
            .Select(section => new
            {
                section.Grade,
                section.Section,
                ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(section.Grade, section.Section),
                section.ClassTeacherId
            })
            .ToList();

        var subjectOptions = subjects
            .Select(subject => new
            {
                subject.Id,
                subject.Name,
                subject.Grade,
                subject.Section,
                ClassDisplay = ClassAssignmentPolicy.FormatClassDisplay(subject.Grade, subject.Section),
                Label = $"{subject.Name} · {ClassAssignmentPolicy.FormatClassDisplay(subject.Grade, subject.Section)}"
            })
            .ToList();

        return Ok(new
        {
            Grades = studentHierarchy,
            Teachers = teachers,
            Admins = admins,
            AvailableClasses = availableClasses,
            AvailableSubjects = subjectOptions
        });
    }

    [HttpPut("class-teacher")]
    public async Task<IActionResult> SetClassTeacher([FromBody] SetClassTeacherDto dto)
    {
        try
        {
            await _userService.SetClassTeacherAsync(dto.Grade, dto.Section, dto.TeacherId);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Deletes a user
    /// </summary>
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        try
        {
            await _userService.DeleteAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}

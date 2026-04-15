using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EduPlatform.API.Services.Interfaces;
using EduPlatform.API.DTOs;
using System.Text.Json;
using System.Security.Claims;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class LessonsController : ControllerBase
{
    private readonly ILessonService _lessonService;

    public LessonsController(ILessonService lessonService)
    {
        _lessonService = lessonService;
    }

    /// <summary>
    /// Gets all lessons
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] bool ignoreClassFilter = false)
    {
        var lessons = await _lessonService.GetAllAsync(
            GetCurrentUserIdOrDefault(),
            GetCurrentRoleOrDefault(),
            ignoreClassFilter);
        return Ok(lessons);
    }

    /// <summary>
    /// Gets a lesson by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var lesson = await _lessonService.GetByIdAsync(id, GetCurrentUserIdOrDefault(), GetCurrentRoleOrDefault());

        if (lesson == null)
            return NotFound(new { error = "Lesson not found" });

        return Ok(lesson);
    }

    /// <summary>
    /// Gets all lessons for a specific subject
    /// </summary>
    [HttpGet("subject/{subjectId}")]
    public async Task<IActionResult> GetBySubject(int subjectId, [FromQuery] bool ignoreClassFilter = false)
    {
        try
        {
            var lessons = await _lessonService.GetBySubjectIdAsync(
                subjectId,
                GetCurrentUserIdOrDefault(),
                GetCurrentRoleOrDefault(),
                ignoreClassFilter);
            return Ok(lessons);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Creates a new lesson (Admin only)
    /// </summary>
    [Authorize(Roles = "Admin,Teacher")]
    [HttpPost]
    public async Task<IActionResult> Create([FromForm] LessonUpsertFormDto form)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<LessonUpsertDto>(form.Payload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? throw new InvalidOperationException("Invalid lesson payload.");

            var lesson = await _lessonService.CreateAsync(dto, form.Image, form.Attachment, GetCurrentUserId());
            return CreatedAtAction(nameof(GetById), new { id = lesson.Id }, lesson);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing lesson (Admin only)
    /// </summary>
    [Authorize(Roles = "Admin,Teacher")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromForm] LessonUpsertFormDto form)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<LessonUpsertDto>(form.Payload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? throw new InvalidOperationException("Invalid lesson payload.");

            var lesson = await _lessonService.UpdateAsync(id, dto, form.Image, form.Attachment, GetCurrentUserId(), GetCurrentRole());
            return Ok(lesson);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Deletes a lesson (Admin only)
    /// </summary>
    [Authorize(Roles = "Admin,Teacher")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _lessonService.DeleteAsync(id, GetCurrentUserId(), GetCurrentRole());
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("userId")?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
            throw new InvalidOperationException("User id claim missing.");
        return userId;
    }

    private int GetCurrentUserIdOrDefault()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("userId")?.Value;
        return int.TryParse(userIdClaim, out var userId) ? userId : 0;
    }

    private string GetCurrentRole() => User.FindFirst(ClaimTypes.Role)?.Value ?? string.Empty;

    private string GetCurrentRoleOrDefault() => User.FindFirst(ClaimTypes.Role)?.Value ?? "Student";
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EduPlatform.API.Services.Interfaces;
using EduPlatform.API.DTOs;

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
    public async Task<IActionResult> GetAll()
    {
        var lessons = await _lessonService.GetAllAsync();
        return Ok(lessons);
    }

    /// <summary>
    /// Gets a lesson by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var lesson = await _lessonService.GetByIdAsync(id);

        if (lesson == null)
            return NotFound(new { error = "Lesson not found" });

        return Ok(lesson);
    }

    /// <summary>
    /// Gets all lessons for a specific subject
    /// </summary>
    [HttpGet("subject/{subjectId}")]
    public async Task<IActionResult> GetBySubject(int subjectId)
    {
        try
        {
            var lessons = await _lessonService.GetBySubjectIdAsync(subjectId);
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
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateLessonDto dto)
    {
        try
        {
            var lesson = await _lessonService.CreateAsync(dto);
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
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateLessonDto dto)
    {
        try
        {
            var lesson = await _lessonService.UpdateAsync(id, dto);
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
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _lessonService.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}

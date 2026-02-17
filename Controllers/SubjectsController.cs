using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EduPlatform.API.Services.Interfaces;
using EduPlatform.API.DTOs;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SubjectsController : ControllerBase
{
    private readonly ISubjectService _subjectService;

    public SubjectsController(ISubjectService subjectService)
    {
        _subjectService = subjectService;
    }

    /// <summary>
    /// Gets all subjects
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var subjects = await _subjectService.GetAllAsync();
        return Ok(subjects);
    }

    /// <summary>
    /// Gets a subject by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var subject = await _subjectService.GetByIdAsync(id);

        if (subject == null)
            return NotFound(new { error = "Subject not found" });

        return Ok(subject);
    }

    /// <summary>
    /// Creates a new subject (Admin only)
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSubjectDto dto)
    {
        try
        {
            var subject = await _subjectService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = subject.Id }, subject);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Updates an existing subject (Admin only)
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSubjectDto dto)
    {
        try
        {
            var subject = await _subjectService.UpdateAsync(id, dto);
            return Ok(subject);
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
    /// Deletes a subject (Admin only)
    /// </summary>
    [Authorize(Roles = "Admin")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _subjectService.DeleteAsync(id);
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}

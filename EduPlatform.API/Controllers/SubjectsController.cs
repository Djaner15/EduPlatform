using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EduPlatform.API.Services.Interfaces;
using EduPlatform.API.DTOs;
using System.Security.Claims;

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
        var subjects = await _subjectService.GetAllAsync(GetCurrentUserIdOrDefault(), GetCurrentRoleOrDefault());
        return Ok(subjects);
    }

    /// <summary>
    /// Gets a subject by ID
    /// </summary>
    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var subject = await _subjectService.GetByIdAsync(id, GetCurrentUserIdOrDefault(), GetCurrentRoleOrDefault());

        if (subject == null)
            return NotFound(new { error = "Subject not found" });

        return Ok(subject);
    }

    /// <summary>
    /// Creates a new subject (Admin only)
    /// </summary>
    [Authorize(Roles = "Admin,Teacher")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateSubjectDto dto)
    {
        try
        {
            var subject = await _subjectService.CreateAsync(dto, GetCurrentUserId());
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
    [Authorize(Roles = "Admin,Teacher")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] UpdateSubjectDto dto)
    {
        try
        {
            var subject = await _subjectService.UpdateAsync(id, dto, GetCurrentUserId(), GetCurrentRole());
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
    [Authorize(Roles = "Admin,Teacher")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _subjectService.DeleteAsync(id, GetCurrentUserId(), GetCurrentRole());
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

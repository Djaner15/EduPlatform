using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EduPlatform.API.Services.Interfaces;
using EduPlatform.API.DTOs;
using System.Text.Json;
using System.Security.Claims;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class TestsController : ControllerBase
{
    private readonly ITestService _testService;

    public TestsController(ITestService testService)
    {
        _testService = testService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var tests = await _testService.GetAllAsync(GetCurrentUserIdOrDefault(), GetCurrentRoleOrDefault());
        return Ok(tests);
    }

    [Authorize]
    [HttpGet("me/results")]
    public async Task<IActionResult> GetMyResults()
    {
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                               ?? User.FindFirst("userId")?.Value;
        if (string.IsNullOrEmpty(userIdClaim))
            return Unauthorized(new { error = "User id claim missing" });

        var userId = int.Parse(userIdClaim);
        var results = await _testService.GetResultsForUserAsync(userId);
        return Ok(results);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var test = await _testService.GetByIdAsync(id, GetCurrentUserIdOrDefault(), GetCurrentRoleOrDefault());
        if (test == null) return NotFound(new { error = "Test not found" });
        return Ok(test);
    }

    [Authorize(Roles = "Admin,Teacher")]
    [HttpPost]
    public async Task<IActionResult> Create([FromForm] TestUpsertFormDto form)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<TestUpsertDto>(form.Payload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? throw new InvalidOperationException("Invalid test payload.");

            var test = await _testService.CreateAsync(dto, Request.Form.Files, GetCurrentUserId());
            return CreatedAtAction(nameof(GetById), new { id = test.Id }, test);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin,Teacher")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromForm] TestUpsertFormDto form)
    {
        try
        {
            var dto = JsonSerializer.Deserialize<TestUpsertDto>(form.Payload, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            }) ?? throw new InvalidOperationException("Invalid test payload.");

            var test = await _testService.UpdateAsync(id, dto, Request.Form.Files, GetCurrentUserId(), GetCurrentRole());
            return Ok(test);
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

    [Authorize(Roles = "Admin,Teacher")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        try
        {
            await _testService.DeleteAsync(id, GetCurrentUserId(), GetCurrentRole());
            return NoContent();
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    /// <summary>
    /// Submit test answers (authenticated users)
    /// </summary>
    [Authorize]
    [HttpPost("{id}/submit")]
    public async Task<IActionResult> Submit(int id, [FromBody] SubmitTestDto dto)
    {
        try
        {
            var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                               ?? User.FindFirst("userId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim))
                return Unauthorized(new { error = "User id claim missing" });

            var userId = int.Parse(userIdClaim);

            var result = await _testService.SubmitTestAsync(id, userId, dto);
            return Ok(result);
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

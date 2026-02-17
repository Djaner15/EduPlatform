using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EduPlatform.API.Services;
using EduPlatform.API.Services.Interfaces;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly UserService _userService;
    private readonly ITestService _testService;

    public AdminController(UserService userService, ITestService testService)
    {
        _userService = userService;
        _testService = testService;
    }

    // GET: /api/admin/users
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers()
    {
        var users = await _userService.GetAllAsync();
        var result = users.Select(u => new
        {
            u.Id,
            u.Username,
            u.Email,
            Role = u.Role?.Name
        });
        return Ok(result);
    }

    // DELETE: /api/admin/users/{id}
    [HttpDelete("users/{id}")]
    public async Task<IActionResult> DeleteUser(int id)
    {
        try
        {
            await _userService.DeleteAsync(id);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    // GET: /api/admin/test-results
    [HttpGet("test-results")]
    public async Task<IActionResult> GetAllTestResults()
    {
        var results = await _testService.GetAllResultsAsync();
        return Ok(results);
    }

    // GET: /api/admin/statistics
    [HttpGet("statistics")]
    public async Task<IActionResult> GetStatistics()
    {
        var stats = await _testService.GetStatisticsAsync();
        return Ok(stats);
    }
}

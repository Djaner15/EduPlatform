using System.Security.Claims;
using EduPlatform.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Teacher")]
public class TeacherController : ControllerBase
{
    private readonly ITestService _testService;

    public TeacherController(ITestService testService)
    {
        _testService = testService;
    }

    [HttpGet("overview")]
    public async Task<IActionResult> GetOverview()
    {
        var stats = await _testService.GetTeacherOverviewStatsAsync(GetCurrentUserId());
        return Ok(stats);
    }

    private int GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("userId")?.Value;
        if (!int.TryParse(userIdClaim, out var userId))
        {
            throw new InvalidOperationException("User id claim missing.");
        }

        return userId;
    }
}

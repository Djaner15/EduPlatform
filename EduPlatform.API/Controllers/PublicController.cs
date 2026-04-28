using EduPlatform.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PublicController : ControllerBase
{
    private readonly ITestService _testService;

    public PublicController(ITestService testService)
    {
        _testService = testService;
    }

    [HttpGet("platform-overview")]
    public async Task<IActionResult> GetPlatformOverview()
    {
        var overview = await _testService.GetPlatformOverviewAsync();
        return Ok(overview);
    }
}

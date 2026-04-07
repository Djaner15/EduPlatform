using EduPlatform.API.DTOs.Ai;
using EduPlatform.API.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AiController : ControllerBase
{
    private readonly IAiService _aiService;

    public AiController(IAiService aiService)
    {
        _aiService = aiService;
    }

    [Authorize(Roles = "Admin,Teacher")]
    [HttpPost("generate-test")]
    public async Task<IActionResult> GenerateTest([FromBody] AiGenerateTestRequestDto dto, CancellationToken cancellationToken)
    {
        var generated = await _aiService.GenerateTestAsync(dto, cancellationToken);
        return Ok(generated);
    }

    [Authorize]
    [HttpPost("explain")]
    public async Task<IActionResult> Explain([FromBody] AiExplainRequestDto dto, CancellationToken cancellationToken)
    {
        var explanation = await _aiService.ExplainAnswerAsync(dto, cancellationToken);
        return Ok(explanation);
    }
}

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using EduPlatform.API.Services.Interfaces;
using EduPlatform.API.DTOs;

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
        var tests = await _testService.GetAllAsync();
        return Ok(tests);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetById(int id)
    {
        var test = await _testService.GetByIdAsync(id);
        if (test == null) return NotFound(new { error = "Test not found" });
        return Ok(test);
    }

    [Authorize(Roles = "Admin")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateTestDto dto)
    {
        try
        {
            var test = await _testService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = test.Id }, test);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [Authorize(Roles = "Admin")]
    [HttpPost("{id}/questions")]
    public async Task<IActionResult> AddQuestion(int id, [FromBody] CreateQuestionDto dto)
    {
        try
        {
            var question = await _testService.AddQuestionAsync(id, dto);
            return CreatedAtAction(nameof(GetById), new { id = id }, question);
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
}

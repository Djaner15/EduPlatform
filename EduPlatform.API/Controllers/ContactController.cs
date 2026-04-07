using EduPlatform.API.DTOs.Contact;
using EduPlatform.API.Services.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace EduPlatform.API.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ContactController : ControllerBase
{
    private readonly IEmailService _emailService;

    public ContactController(IEmailService emailService)
    {
        _emailService = emailService;
    }

    [HttpPost]
    public async Task<IActionResult> SendMessage([FromBody] ContactMessageDto dto)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        await _emailService.SendContactMessageAsync(dto.Name.Trim(), dto.Email.Trim(), dto.Message.Trim());

        return Ok(new
        {
            message = "Your message has been sent successfully. We will get back to you soon."
        });
    }
}

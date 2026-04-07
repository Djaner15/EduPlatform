using EduPlatform.API.DTOs.Ai;

namespace EduPlatform.API.Services.Interfaces;

public interface IAiService
{
    Task<AiGenerateTestResponseDto> GenerateTestAsync(AiGenerateTestRequestDto dto, CancellationToken cancellationToken = default);
    Task<AiExplainResponseDto> ExplainAnswerAsync(AiExplainRequestDto dto, CancellationToken cancellationToken = default);
}

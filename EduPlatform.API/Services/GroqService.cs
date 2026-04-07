using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using EduPlatform.API.Data;
using EduPlatform.API.DTOs.Ai;
using EduPlatform.API.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace EduPlatform.API.Services;

public class GroqService : IAiService
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly AppDbContext _context;

    public GroqService(HttpClient httpClient, IConfiguration configuration, AppDbContext context)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _context = context;
    }

    public async Task<AiGenerateTestResponseDto> GenerateTestAsync(
        AiGenerateTestRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Topic))
        {
            throw new InvalidOperationException("Topic is required.");
        }

        var normalizedDifficulty = dto.Difficulty.Trim().ToLowerInvariant();
        if (normalizedDifficulty is not ("easy" or "medium" or "hard"))
        {
            throw new InvalidOperationException("Difficulty must be easy, medium, or hard.");
        }

        if (dto.QuestionCount is < 1 or > 12)
        {
            throw new InvalidOperationException("Question count must be between 1 and 12.");
        }

        var generatedJson = await SendJsonRequestAsync(
            systemPrompt:
                "You generate school assessment drafts for a learning platform. " +
                "Return only valid JSON and no markdown. " +
                "Create educational, factually grounded multiple-choice questions. " +
                "Each question must have exactly four answer options and exactly one correct answer.",
            userPrompt:
                $"Topic: {dto.Topic.Trim()}\n" +
                $"Difficulty: {normalizedDifficulty}\n" +
                $"Number of questions: {dto.QuestionCount}\n\n" +
                "Return JSON in this exact shape:\n" +
                "{\"title\":\"string\",\"questions\":[{\"text\":\"string\",\"answers\":[{\"text\":\"string\",\"isCorrect\":true},{\"text\":\"string\",\"isCorrect\":false},{\"text\":\"string\",\"isCorrect\":false},{\"text\":\"string\",\"isCorrect\":false}]}]}",
            cancellationToken: cancellationToken);

        var generated = JsonSerializer.Deserialize<AiGenerateTestResponseDto>(generatedJson, JsonOptions)
            ?? throw new InvalidOperationException("Groq returned an empty test draft.");

        if (generated.Questions.Count != dto.QuestionCount)
        {
            throw new InvalidOperationException("Groq did not return the requested number of questions. Please try again.");
        }

        foreach (var question in generated.Questions)
        {
            if (string.IsNullOrWhiteSpace(question.Text))
            {
                throw new InvalidOperationException("Groq returned a question without text. Please try again.");
            }

            if (question.Answers.Count != 4)
            {
                throw new InvalidOperationException("Groq returned a question without exactly four answers. Please try again.");
            }

            if (question.Answers.Count(answer => answer.IsCorrect) != 1)
            {
                throw new InvalidOperationException("Groq returned a question without a single correct answer. Please try again.");
            }
        }

        generated.Title = string.IsNullOrWhiteSpace(generated.Title)
            ? $"{dto.Topic.Trim()} Assessment"
            : generated.Title.Trim();

        return generated;
    }

    public async Task<AiExplainResponseDto> ExplainAnswerAsync(
        AiExplainRequestDto dto,
        CancellationToken cancellationToken = default)
    {
        var question = await _context.Questions
            .Include(q => q.Test).ThenInclude(t => t.Lesson).ThenInclude(l => l.Subject)
            .Include(q => q.Answers)
            .FirstOrDefaultAsync(q => q.Id == dto.QuestionId && q.TestId == dto.TestId, cancellationToken);

        if (question == null)
        {
            throw new KeyNotFoundException("Question not found.");
        }

        var selectedAnswerText = question.Type.Equals("text", StringComparison.OrdinalIgnoreCase)
            ? dto.TextAnswer?.Trim()
            : question.Answers.FirstOrDefault(answer => answer.Id == dto.SelectedAnswerId)?.Text;

        var correctAnswerText = question.Type.Equals("text", StringComparison.OrdinalIgnoreCase)
            ? question.CorrectTextAnswer?.Trim()
            : question.Answers.FirstOrDefault(answer => answer.IsCorrect)?.Text;

        var optionsText = question.Answers.Any()
            ? string.Join("\n", question.Answers.Select((answer, index) => $"{index + 1}. {answer.Text}"))
            : "No fixed answer options";

        var explanationJson = await SendJsonRequestAsync(
            systemPrompt:
                "You explain assessment answers for students. " +
                "Be encouraging, concise, and educational. " +
                "Return only valid JSON and no markdown.",
            userPrompt:
                $"Subject: {question.Test.Lesson.Subject.Name}\n" +
                $"Test title: {question.Test.Title}\n" +
                $"Question type: {question.Type}\n" +
                $"Question: {question.Text}\n" +
                $"Answer options:\n{optionsText}\n" +
                $"Student answer: {selectedAnswerText ?? "No answer submitted"}\n" +
                $"Correct answer: {correctAnswerText ?? "Not available"}\n\n" +
                "Write a short explanation for the student in clear English. If the answer is wrong, explain why the correct answer works and why the selected answer does not.\n\n" +
                "Return JSON in this exact shape:\n" +
                "{\"explanation\":\"string\"}",
            cancellationToken: cancellationToken);

        var explanation = JsonSerializer.Deserialize<AiExplainResponseDto>(explanationJson, JsonOptions)
            ?? throw new InvalidOperationException("Groq returned an empty explanation.");

        if (string.IsNullOrWhiteSpace(explanation.Explanation))
        {
            throw new InvalidOperationException("Groq returned an empty explanation.");
        }

        explanation.Explanation = explanation.Explanation.Trim();
        return explanation;
    }

    private async Task<string> SendJsonRequestAsync(
        string systemPrompt,
        string userPrompt,
        CancellationToken cancellationToken)
    {
        var apiKey = GetRequiredSetting("GROQ_API_KEY", "Groq:ApiKey");
        var model = _configuration["Groq:Model"]
            ?? Environment.GetEnvironmentVariable("GROQ_MODEL")
            ?? "llama-3.3-70b-versatile";

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.groq.com/openai/v1/chat/completions");
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        var payload = new JsonObject
        {
            ["model"] = model,
            ["messages"] = new JsonArray
            {
                new JsonObject
                {
                    ["role"] = "system",
                    ["content"] = systemPrompt
                },
                new JsonObject
                {
                    ["role"] = "user",
                    ["content"] = userPrompt
                }
            },
            ["response_format"] = new JsonObject
            {
                ["type"] = "json_object"
            },
            ["temperature"] = 0.4,
            ["max_tokens"] = 2200
        };

        request.Content = new StringContent(payload.ToJsonString(), Encoding.UTF8, "application/json");

        using var response = await _httpClient.SendAsync(request, cancellationToken);
        var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException(ExtractGroqErrorMessage(responseBody));
        }

        var json = JsonNode.Parse(responseBody)?.AsObject()
            ?? throw new InvalidOperationException("Groq response could not be parsed.");

        var content = json["choices"]?.AsArray().FirstOrDefault()?["message"]?["content"]?.GetValue<string>();
        if (string.IsNullOrWhiteSpace(content))
        {
            throw new InvalidOperationException("Groq returned no usable output. Please try again.");
        }

        return ExtractJson(content);
    }

    private string GetRequiredSetting(string environmentKey, string configurationKey)
    {
        return Environment.GetEnvironmentVariable(environmentKey)
            ?? _configuration[configurationKey]
            ?? throw new InvalidOperationException(
                "Groq API key is not configured. Add GROQ_API_KEY to EduPlatform.API/.env before using AI features.");
    }

    private static string ExtractGroqErrorMessage(string responseBody)
    {
        try
        {
            var json = JsonNode.Parse(responseBody)?.AsObject();
            var message = json?["error"]?["message"]?.GetValue<string>();
            if (!string.IsNullOrWhiteSpace(message))
            {
                return $"Groq request failed: {message}";
            }
        }
        catch
        {
        }

        return "Groq request failed. Please try again later.";
    }

    private static string ExtractJson(string text)
    {
        var trimmed = text.Trim();

        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            trimmed = trimmed
                .Replace("```json", string.Empty, StringComparison.OrdinalIgnoreCase)
                .Replace("```", string.Empty, StringComparison.Ordinal)
                .Trim();
        }

        var objectStart = trimmed.IndexOf('{');
        var objectEnd = trimmed.LastIndexOf('}');

        if (objectStart >= 0 && objectEnd > objectStart)
        {
            return trimmed.Substring(objectStart, objectEnd - objectStart + 1);
        }

        throw new InvalidOperationException("Groq did not return valid JSON. Please try again.");
    }
}

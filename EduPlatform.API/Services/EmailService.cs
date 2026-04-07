using System.Net;
using System.Net.Mail;
using System.Text;
using EduPlatform.API.Services.Interfaces;
using Microsoft.Extensions.Hosting;

namespace EduPlatform.API.Services;

public class EmailService : IEmailService
{
    private const string EmailLogoContentId = "eduplatform-dolphin-logo";
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly IWebHostEnvironment _environment;

    public EmailService(
        IConfiguration configuration,
        ILogger<EmailService> logger,
        IWebHostEnvironment environment)
    {
        _configuration = configuration;
        _logger = logger;
        _environment = environment;
    }

    public Task SendRegistrationReceivedAsync(string toEmail, string username)
    {
        var subject = "Registration received - EduPlatform";
        var body =
            $"Hello {username},\n\n" +
            "Your registration for the Mathematics High School \"Academic Kiril Popov\" platform was received.\n" +
            "An administrator will review your account and you will receive another email after approval.\n\n" +
            "Best regards,\nEduPlatform";

        var htmlBody = BuildEmailHtml(
            heading: "Registration Received",
            eyebrow: "EduPlatform access request",
            greeting: $"Hello {username},",
            firstParagraph: "Your registration for the Mathematics High School \"Academic Kiril Popov\" platform was received.",
            secondParagraph: "An administrator will review your account and you will receive another email after approval.",
            accentLabel: "Pending Review",
            accentText: "We will notify you as soon as your account is approved.",
            buttonText: null,
            buttonUrl: null);

        return SendEmailAsync(toEmail, subject, body, htmlBody);
    }

    public Task SendAccountCreatedByAdminAsync(string toEmail, string username, string roleName, string temporaryPassword)
    {
        var subject = "Your EduPlatform account is ready";
        var loginUrl = ResolveLoginUrl();
        var safeRoleName = string.IsNullOrWhiteSpace(roleName) ? "user" : roleName.Trim().ToLowerInvariant();
        var body =
            $"Hello {username},\n\n" +
            $"An administrator created your EduPlatform account for the role of {safeRoleName}.\n" +
            $"Username: {username}\n" +
            $"Temporary password: {temporaryPassword}\n" +
            $"Login here: {loginUrl}\n\n" +
            "You can sign in immediately. If you have trouble accessing the platform, please reply to this email.\n\n" +
            "Best regards,\nEduPlatform";

        var htmlBody = BuildEmailHtml(
            heading: "Account Created",
            eyebrow: "Platform access granted",
            greeting: $"Hello {username},",
            firstParagraph: $"An administrator created your EduPlatform account for the role of {safeRoleName}.",
            secondParagraph: "You can sign in immediately using the credentials below and start using the platform.",
            accentLabel: "Your login details",
            accentText: $"Username: {username}<br />Temporary password: {temporaryPassword}",
            buttonText: "Open EduPlatform",
            buttonUrl: loginUrl);

        return SendEmailAsync(toEmail, subject, body, htmlBody);
    }

    public Task SendApprovalGrantedAsync(string toEmail, string username)
    {
        var subject = "Account approved - EduPlatform";
        var loginUrl = ResolveLoginUrl();
        var body =
            $"Hello {username},\n\n" +
            "Your account has been approved and you can now log in as a student of Mathematics High School \"Academic Kiril Popov\".\n" +
            $"Login here: {loginUrl}\n" +
            "After signing in, you will be able to access your subjects, lessons, tests, and school information.\n\n" +
            "Best regards,\nEduPlatform";

        var htmlBody = BuildEmailHtml(
            heading: "Account Approved",
            eyebrow: "Student access unlocked",
            greeting: $"Hello {username},",
            firstParagraph: "Your account has been approved and you can now log in as a student of Mathematics High School \"Academic Kiril Popov\".",
            secondParagraph: "After signing in, you will be able to access your subjects, lessons, tests, and school information.",
            accentLabel: "Ready to begin",
            accentText: "Open your student portal to continue learning, review lessons, and take tests.",
            buttonText: "Open EduPlatform",
            buttonUrl: loginUrl);

        return SendEmailAsync(toEmail, subject, body, htmlBody);
    }

    public Task SendApprovalRevokedAsync(string toEmail, string username)
    {
        var subject = "Access revoked - EduPlatform";
        var body =
            $"Hello {username},\n\n" +
            "Your access to EduPlatform has been revoked by an administrator.\n" +
            "You will not be able to log in until your account is approved again.\n\n" +
            "If you believe this was a mistake, reply to this email and contact the school administration.\n\n" +
            "Best regards,\nEduPlatform";

        var htmlBody = BuildEmailHtml(
            heading: "Access Revoked",
            eyebrow: "Student access update",
            greeting: $"Hello {username},",
            firstParagraph: "Your access to EduPlatform has been revoked by an administrator.",
            secondParagraph: "You will not be able to log in until your account is approved again.",
            accentLabel: "Need help?",
            accentText: "If you believe this was a mistake, reply to this email and contact the school administration.",
            buttonText: null,
            buttonUrl: null);

        return SendEmailAsync(toEmail, subject, body, htmlBody);
    }

    public Task SendAccountRemovedAsync(string toEmail, string username)
    {
        var subject = "Account removed - EduPlatform";
        var body =
            $"Hello {username},\n\n" +
            "Your EduPlatform account has been removed by an administrator.\n" +
            "You can no longer access the platform with this account.\n\n" +
            "If you think this was done in error, please contact the school administration.\n\n" +
            "Best regards,\nEduPlatform";

        var htmlBody = BuildEmailHtml(
            heading: "Account Removed",
            eyebrow: "Account status update",
            greeting: $"Hello {username},",
            firstParagraph: "Your EduPlatform account has been removed by an administrator.",
            secondParagraph: "You can no longer access the platform with this account.",
            accentLabel: "Contact the school",
            accentText: "If you think this was done in error, please contact the school administration.",
            buttonText: null,
            buttonUrl: null);

        return SendEmailAsync(toEmail, subject, body, htmlBody);
    }

    public Task SendContactMessageAsync(string senderName, string senderEmail, string message)
    {
        var supportEmail = ResolveSupportInbox();
        var subject = $"New contact message from {senderName} - EduPlatform";
        var body =
            $"Name: {senderName}\n" +
            $"Email: {senderEmail}\n\n" +
            "Message:\n" +
            $"{message}\n";

        var htmlBody = BuildEmailHtml(
            heading: "New Contact Message",
            eyebrow: "Support inbox update",
            greeting: "Hello EduPlatform team,",
            firstParagraph: $"You have received a new contact request from {senderName} ({senderEmail}).",
            secondParagraph: message,
            accentLabel: "Reply to sender",
            accentText: $"Use {senderEmail} to respond directly to this request.",
            buttonText: null,
            buttonUrl: null);

        return SendEmailAsync(supportEmail, subject, body, htmlBody, senderEmail, senderName);
    }

    private async Task SendEmailAsync(
        string toEmail,
        string subject,
        string body,
        string htmlBody,
        string? overrideReplyToAddress = null,
        string? overrideReplyToName = null)
    {
        var host = _configuration["Email:SmtpHost"];
        var portValue = _configuration["Email:SmtpPort"];
        var username = _configuration["Email:Username"];
        var password = NormalizeSmtpPassword(_configuration["Email:Password"]);
        var configuredFrom = _configuration["Email:From"];
        var fromName = _configuration["Email:FromName"] ?? "EduPlatform";
        var replyTo = _configuration["Email:ReplyTo"];
        var from = ResolveFromAddress(configuredFrom, username);

        if (string.IsNullOrWhiteSpace(host) ||
            string.IsNullOrWhiteSpace(portValue) ||
            string.IsNullOrWhiteSpace(from))
        {
            await WriteEmailToOutboxAsync(toEmail, subject, body, "missing-smtp-settings");
            _logger.LogWarning("Email settings are missing. Email was written to the outbox for {ToEmail} with subject {Subject}.", toEmail, subject);
            return;
        }

        if (!int.TryParse(portValue, out var port))
        {
            await WriteEmailToOutboxAsync(toEmail, subject, body, "invalid-smtp-port");
            _logger.LogWarning("Invalid SMTP port configuration. Email was written to the outbox for {ToEmail}.", toEmail);
            return;
        }

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = bool.TryParse(_configuration["Email:EnableSsl"], out var enableSsl) && enableSsl
        };

        if (!string.IsNullOrWhiteSpace(username) && !string.IsNullOrWhiteSpace(password))
        {
            client.Credentials = new NetworkCredential(username, password);
        }

        using var message = new MailMessage
        {
            From = new MailAddress(from, fromName),
            Subject = subject,
            Body = body,
            IsBodyHtml = false,
            BodyEncoding = Encoding.UTF8,
            SubjectEncoding = Encoding.UTF8
        };

        message.To.Add(toEmail);
        var replyToAddress = string.IsNullOrWhiteSpace(overrideReplyToAddress)
            ? string.IsNullOrWhiteSpace(replyTo)
                ? configuredFrom
                : replyTo
            : overrideReplyToAddress;

        if (!string.IsNullOrWhiteSpace(replyToAddress))
        {
            var replyToDisplayName = string.IsNullOrWhiteSpace(overrideReplyToName) ? fromName : overrideReplyToName;
            message.ReplyToList.Add(new MailAddress(replyToAddress, replyToDisplayName));
        }

        var htmlView = AlternateView.CreateAlternateViewFromString(htmlBody, Encoding.UTF8, "text/html");
        var logoPath = Path.Combine(_environment.ContentRootPath, "Assets", "dolphin-logo.png");

        if (File.Exists(logoPath))
        {
            var logoResource = new LinkedResource(logoPath, "image/png")
            {
                ContentId = EmailLogoContentId,
                TransferEncoding = System.Net.Mime.TransferEncoding.Base64
            };

            htmlView.LinkedResources.Add(logoResource);
        }

        message.AlternateViews.Add(htmlView);
        try
        {
            await client.SendMailAsync(message);
        }
        catch (Exception ex)
        {
            await WriteEmailToOutboxAsync(toEmail, subject, body, "smtp-send-failed");
            _logger.LogError(ex, "SMTP sending failed. Email was written to the outbox for {ToEmail}.", toEmail);
        }
    }

    private async Task WriteEmailToOutboxAsync(string toEmail, string subject, string body, string reason)
    {
        var folder = _configuration["Email:PickupFolder"];
        var outboxFolder = string.IsNullOrWhiteSpace(folder)
            ? Path.Combine(_environment.ContentRootPath, "email-outbox")
            : Path.IsPathRooted(folder)
                ? folder
                : Path.GetFullPath(Path.Combine(_environment.ContentRootPath, folder));

        Directory.CreateDirectory(outboxFolder);

        var safeEmail = toEmail.Replace("@", "_at_").Replace(".", "_");
        var timestamp = DateTime.UtcNow.ToString("yyyyMMdd-HHmmssfff");
        var filePath = Path.Combine(outboxFolder, $"{timestamp}-{safeEmail}-{reason}.txt");

        var content = new StringBuilder()
            .AppendLine($"To: {toEmail}")
            .AppendLine($"Subject: {subject}")
            .AppendLine($"Reason: {reason}")
            .AppendLine($"GeneratedAtUtc: {DateTime.UtcNow:O}")
            .AppendLine($"From: {ResolveFromAddress(_configuration["Email:From"], _configuration["Email:Username"])}")
            .AppendLine()
            .AppendLine(body)
            .ToString();

        await File.WriteAllTextAsync(filePath, content);
    }

    private string ResolveLoginUrl()
    {
        var configuredUrl = _configuration["Email:FrontendUrl"];

        if (!string.IsNullOrWhiteSpace(configuredUrl))
        {
            return AppendQueryString(configuredUrl, "logout=1&mode=login");
        }

        return "http://localhost:5173/login?logout=1&mode=login";
    }

    private string ResolveSupportInbox()
    {
        var configuredReplyTo = _configuration["Email:ReplyTo"];
        if (!string.IsNullOrWhiteSpace(configuredReplyTo))
        {
            return configuredReplyTo;
        }

        var configuredFrom = _configuration["Email:From"];
        if (!string.IsNullOrWhiteSpace(configuredFrom))
        {
            return configuredFrom;
        }

        var username = _configuration["Email:Username"];
        if (!string.IsNullOrWhiteSpace(username))
        {
            return username;
        }

        return "eduplatform.support@gmail.com";
    }

    private static string BuildEmailHtml(
        string heading,
        string eyebrow,
        string greeting,
        string firstParagraph,
        string secondParagraph,
        string accentLabel,
        string accentText,
        string? buttonText,
        string? buttonUrl)
    {
        var encodedHeading = WebUtility.HtmlEncode(heading);
        var encodedEyebrow = WebUtility.HtmlEncode(eyebrow);
        var encodedGreeting = WebUtility.HtmlEncode(greeting);
        var encodedFirstParagraph = WebUtility.HtmlEncode(firstParagraph);
        var encodedSecondParagraph = WebUtility.HtmlEncode(secondParagraph);
        var encodedAccentLabel = WebUtility.HtmlEncode(accentLabel);
        var encodedAccentText = WebUtility.HtmlEncode(accentText).Replace("&lt;br /&gt;", "<br />", StringComparison.Ordinal);
        var encodedButtonText = string.IsNullOrWhiteSpace(buttonText) ? null : WebUtility.HtmlEncode(buttonText);
        var encodedButtonUrl = string.IsNullOrWhiteSpace(buttonUrl) ? null : WebUtility.HtmlEncode(buttonUrl);
        var actionMarkup = encodedButtonText is null || encodedButtonUrl is null
            ? string.Empty
            : $"""
        <div style="margin-top:28px;">
          <a href="{encodedButtonUrl}" style="display:inline-block;border-radius:999px;background:linear-gradient(135deg,#123d5b 0%,#2468a0 45%,#0f8b8d 100%);padding:14px 24px;color:#ffffff;font-size:15px;font-weight:700;letter-spacing:0.01em;text-decoration:none;box-shadow:0 18px 32px rgba(18,61,91,0.24);">
            {encodedButtonText}
          </a>
        </div>
""";

        return $"""
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#edf3ff;font-family:'Plus Jakarta Sans',Arial,sans-serif;color:#183042;">
    <div style="max-width:680px;margin:0 auto;">
      <div style="margin-bottom:14px;padding:0 6px;color:#183b5b;font-size:13px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;">
        EduPlatform
      </div>
      <div style="border:1px solid rgba(24,59,91,0.12);border-radius:32px;overflow:hidden;background:#ffffff;box-shadow:0 30px 80px rgba(28,57,92,0.16);">
        <div style="padding:32px 32px 30px;background:
          radial-gradient(circle at top left, rgba(90,141,238,0.28), transparent 32%),
          radial-gradient(circle at 88% 18%, rgba(245,185,113,0.22), transparent 24%),
          linear-gradient(135deg,#123d5b 0%,#2468a0 45%,#0f8b8d 100%);
          color:#ffffff;">
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="width:236px;vertical-align:middle;padding:0 8px 0 0;">
                <img src="cid:{EmailLogoContentId}" alt="EduPlatform dolphin logo" style="display:block;width:228px;max-width:228px;height:auto;border:0;outline:none;text-decoration:none;" />
              </td>
              <td style="vertical-align:middle;">
                <div style="display:inline-block;margin-bottom:16px;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,0.14);font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;">
                  {encodedEyebrow}
                </div>
                <h1 style="margin:0;font-family:'Space Grotesk','Plus Jakarta Sans',Arial,sans-serif;font-size:34px;line-height:1.05;">
                  {encodedHeading}
                </h1>
                <p style="max-width:440px;margin:16px 0 0;font-size:15px;line-height:1.7;color:rgba(255,255,255,0.88);">
                  Mathematics High School "Academic Kiril Popov"
                </p>
              </td>
            </tr>
          </table>
        </div>
        <div style="padding:32px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#183042;">{encodedGreeting}</p>
          <p style="margin:0 0 16px;font-size:16px;line-height:1.8;color:#183042;">{encodedFirstParagraph}</p>
          <p style="margin:0;font-size:16px;line-height:1.8;color:#183042;">{encodedSecondParagraph}</p>
          <div style="margin-top:24px;border:1px solid rgba(24,59,91,0.08);border-radius:24px;background:linear-gradient(180deg,rgba(238,246,255,0.92) 0%,rgba(255,248,239,0.92) 100%);padding:20px 22px;">
            <div style="color:#0f8b8d;font-size:12px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">{encodedAccentLabel}</div>
            <p style="margin:10px 0 0;font-size:15px;line-height:1.7;color:#183b5b;">{encodedAccentText}</p>
          </div>
{actionMarkup}          <div style="margin-top:28px;padding-top:22px;border-top:1px solid rgba(24,59,91,0.08);color:#516275;font-size:13px;line-height:1.8;">
            This email was sent automatically from <strong>eduplatform.support@gmail.com</strong>.
          </div>
          <p style="margin:18px 0 0;font-size:15px;line-height:1.8;color:#183042;">
            Best regards,<br />
            <strong>EduPlatform Team</strong>
          </p>
        </div>
      </div>
    </div>    
  </body>
</html>
""";
    }

    private static string? NormalizeSmtpPassword(string? password)
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            return password;
        }

        return password.Replace(" ", string.Empty, StringComparison.Ordinal);
    }

    private static string AppendQueryString(string url, string queryString)
    {
        var separator = url.Contains('?', StringComparison.Ordinal) ? '&' : '?';
        return $"{url}{separator}{queryString}";
    }

    private static string ResolveFromAddress(string? configuredFrom, string? username)
    {
        if (!string.IsNullOrWhiteSpace(username))
        {
            return username;
        }

        if (!string.IsNullOrWhiteSpace(configuredFrom))
        {
            return configuredFrom;
        }

        return "no-reply@eduplatform.com";
    }
}

namespace EduPlatform.API.Services.Interfaces;

public interface IEmailService
{
    Task SendRegistrationReceivedAsync(string toEmail, string username);
    Task SendAccountCreatedByAdminAsync(string toEmail, string username, string roleName, string temporaryPassword);
    Task SendApprovalGrantedAsync(string toEmail, string username);
    Task SendApprovalRevokedAsync(string toEmail, string username);
    Task SendAccountRemovedAsync(string toEmail, string username);
    Task SendContactMessageAsync(string senderName, string senderEmail, string message);
}

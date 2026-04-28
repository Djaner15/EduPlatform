using EduPlatform.API.Configuration;
using EduPlatform.API.Data;
using EduPlatform.API.Models;
using EduPlatform.API.Services;
using EduPlatform.API.Services.Interfaces;
using EduPlatform.API.Middleware;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text;
using BCrypt.Net;

DotEnvLoader.LoadIfExists(
    Path.Combine(Directory.GetCurrentDirectory(), ".env"),
    Path.Combine(Directory.GetCurrentDirectory(), "EduPlatform.API", ".env"));

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy =>
        {
            policy.WithOrigins("http://localhost:5173")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

// --- Database ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=eduplatform.db;Default Timeout=5"));

// --- Services ---
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<ILessonService, LessonService>();
builder.Services.AddScoped<ITestService, TestService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<IEmailService, EmailService>();
builder.Services.AddScoped<IFileStorageService, FileStorageService>();
builder.Services.AddHttpClient<IAiService, GroqService>();

// --- Controllers & Swagger ---
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "EduPlatform API", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = SecuritySchemeType.Http,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = ParameterLocation.Header,
        Description = "Въведете 'Bearer {token}' за да се логнете."
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// --- Authentication & JWT ---
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]!)
        )
    };
});

// --- Authorization ---
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy => policy.RequireRole("Admin"));
    options.AddPolicy("TeacherOnly", policy => policy.RequireRole("Teacher"));
    options.AddPolicy("StudentOnly", policy => policy.RequireRole("Student"));
});

var app = builder.Build();

// --- Middleware pipeline ---
app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "EduPlatform API v1");
    });
}

// app.UseHttpsRedirection(); // временно изключи за Swagger тест

app.UseStaticFiles();
app.UseCors("AllowFrontend");

// ПРАВИЛЕН РЕД:
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// --- Optional Database Bootstrap ---
if (Environment.GetEnvironmentVariable("EDUPLATFORM_ENABLE_BOOTSTRAP") == "1")
{
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    var databasePath = Path.Combine(Directory.GetCurrentDirectory(), "eduplatform.db");
    var isExistingDatabase = File.Exists(databasePath);

    if (!isExistingDatabase)
    {
        db.Database.Migrate();
    }

    db.Database.ExecuteSqlRaw(
        """
        CREATE TABLE IF NOT EXISTS TestResultAnswers (
            Id INTEGER NOT NULL CONSTRAINT PK_TestResultAnswers PRIMARY KEY AUTOINCREMENT,
            TestResultId INTEGER NOT NULL,
            QuestionId INTEGER NOT NULL,
            OrderIndex INTEGER NOT NULL,
            QuestionText TEXT NOT NULL,
            QuestionType TEXT NOT NULL,
            SelectedAnswerId INTEGER NULL,
            StudentAnswerText TEXT NULL,
            CorrectAnswerText TEXT NOT NULL,
            IsCorrect INTEGER NOT NULL,
            Explanation TEXT NULL,
            CONSTRAINT FK_TestResultAnswers_TestResults_TestResultId
                FOREIGN KEY (TestResultId) REFERENCES TestResults (Id) ON DELETE CASCADE
        );
        """);
    db.Database.ExecuteSqlRaw(
        """
        CREATE INDEX IF NOT EXISTS IX_TestResultAnswers_TestResultId
        ON TestResultAnswers (TestResultId);
        """);

    if (!db.Roles.Any())
    {
        db.Roles.AddRange(
            new Role { Name = "Admin" },
            new Role { Name = "Teacher" },
            new Role { Name = "Student" }
        );
        db.SaveChanges();
    }

    var adminRole = db.Roles.FirstOrDefault(role => role.Name == "Admin");
    if (adminRole != null && !db.Users.Any(user => user.Username == "admin"))
    {
        db.Users.Add(new User
        {
            FullName = "System Administrator",
            Username = "admin",
            Email = "admin@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            RoleId = adminRole.Id,
            Grade = null,
            Section = null,
            IsApproved = true,
            ApprovedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
        });
        db.SaveChanges();
    }
}

app.Run();

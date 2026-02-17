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

var builder = WebApplication.CreateBuilder(args);

// --- Database ---
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite("Data Source=eduplatform.db"));

// --- Services ---
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<IAuthService, AuthService>();
builder.Services.AddScoped<ISubjectService, SubjectService>();
builder.Services.AddScoped<ILessonService, LessonService>();
builder.Services.AddScoped<ITestService, TestService>();
builder.Services.AddScoped<UserService>();

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

// --- CORS ---
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader());
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
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "EduPlatform API v1");
    c.RoutePrefix = string.Empty;
});

// app.UseHttpsRedirection(); // временно изключи за Swagger тест

app.UseCors("AllowAll");

// --- Global Exception Handling Middleware ---
app.UseMiddleware<GlobalExceptionHandlingMiddleware>();

app.UseExceptionHandler("/error");

app.Map("/error", (HttpContext context) =>
{
    return Results.Problem("An unexpected error occurred.");
});

// ПРАВИЛЕН РЕД:
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

// --- Database Seeding ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    if (!db.Roles.Any())
    {
        db.Roles.AddRange(
            new Role { Name = "Admin" },
            new Role { Name = "Teacher" },
            new Role { Name = "Student" }
        );

        db.SaveChanges();
    }
}

app.Run();
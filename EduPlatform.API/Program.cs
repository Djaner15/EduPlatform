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
    options.UseSqlite("Data Source=eduplatform.db"));

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

// --- Database Seeding ---
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();

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

    var teacherRole = db.Roles.First(role => role.Name == "Teacher");
    var studentRole = db.Roles.First(role => role.Name == "Student");
    var defaultHash = "$2a$11$9lfjmmIr/Z11LPdbBA73vONJxsylNnMgtMZs1swmkYvIiddyhVmY.";
    var seededSections = new[] { "А", "Б", "В", "Г", "Д", "Е", "Ж", "З" };

    foreach (var grade in Enumerable.Range(8, 5))
    {
        foreach (var section in seededSections)
        {
            if (!db.ClassSections.Any(entry => entry.Grade == grade && entry.Section == section))
            {
                db.ClassSections.Add(new ClassSection { Grade = grade, Section = section });
            }
        }
    }

    db.SaveChanges();

    if (db.Users.Count(user => user.RoleId == teacherRole.Id) < 4)
    {
        var teacherSeeds = new[]
        {
            new { FullName = "Maria Petrova", Username = "teacher.math", Email = "teacher.math@schoolmath.eu" },
            new { FullName = "Elena Georgieva", Username = "teacher.bio", Email = "teacher.bio@schoolmath.eu" },
            new { FullName = "Nikolay Dimitrov", Username = "teacher.info", Email = "teacher.info@schoolmath.eu" },
            new { FullName = "Ivan Stoyanov", Username = "teacher.class", Email = "teacher.class@schoolmath.eu" },
            new { FullName = "Petya Todorova", Username = "teacher.physics", Email = "teacher.physics@schoolmath.eu" }
        };

        foreach (var teacherSeed in teacherSeeds)
        {
            if (!db.Users.Any(user => user.Username == teacherSeed.Username))
            {
                db.Users.Add(new User
                {
                    FullName = teacherSeed.FullName,
                    Username = teacherSeed.Username,
                    Email = teacherSeed.Email,
                    PasswordHash = defaultHash,
                    RoleId = teacherRole.Id,
                    IsApproved = true,
                    ApprovedAt = DateTime.UtcNow
                });
            }
        }

        db.SaveChanges();
    }

    var teachers = db.Users.Where(user => user.RoleId == teacherRole.Id).OrderBy(user => user.Id).Take(5).ToList();

    var mockClasses = new[]
    {
        new { Grade = 8, Section = "А" },
        new { Grade = 8, Section = "Б" },
        new { Grade = 9, Section = "А" },
        new { Grade = 9, Section = "Б" },
        new { Grade = 10, Section = "А" },
        new { Grade = 10, Section = "Б" }
    };

    if (db.Subjects.Count() < 12 && teachers.Count >= 3)
    {
        foreach (var classInfo in mockClasses)
        {
            var subjectSeeds = new[]
            {
                new { Name = "Mathematics", Description = $"Advanced mathematics for {classInfo.Grade}{classInfo.Section}.", TeacherId = teachers[0].Id },
                new { Name = "Biology", Description = $"Biology curriculum for {classInfo.Grade}{classInfo.Section}.", TeacherId = teachers[1].Id },
                new { Name = "Informatics", Description = $"Informatics and technology for {classInfo.Grade}{classInfo.Section}.", TeacherId = teachers[2].Id }
            };

            foreach (var subjectSeed in subjectSeeds)
            {
                if (!db.Subjects.Any(subject => subject.Name == subjectSeed.Name && subject.Grade == classInfo.Grade && subject.Section == classInfo.Section))
                {
                    db.Subjects.Add(new Subject
                    {
                        Name = subjectSeed.Name,
                        Description = subjectSeed.Description,
                        Grade = classInfo.Grade,
                        Section = classInfo.Section,
                        CreatedByUserId = subjectSeed.TeacherId
                    });
                }
            }
        }

        db.SaveChanges();
    }

    if (db.Users.Count(user => user.RoleId == studentRole.Id) < 60)
    {
        foreach (var classInfo in mockClasses)
        {
            var latinSection = classInfo.Section == "А" ? "a" : "b";

            for (var index = 1; index <= 10; index++)
            {
                var username = $"student_{classInfo.Grade}{latinSection}_{index:00}";
                if (db.Users.Any(user => user.Username == username))
                {
                    continue;
                }

                db.Users.Add(new User
                {
                    FullName = $"Student {classInfo.Grade}{classInfo.Section} {index:00}",
                    Username = username,
                    Email = $"{username}@schoolmath.eu",
                    PasswordHash = defaultHash,
                    RoleId = studentRole.Id,
                    Grade = classInfo.Grade,
                    Section = classInfo.Section,
                    IsApproved = true,
                    ApprovedAt = DateTime.UtcNow
                });
            }
        }

        db.SaveChanges();
    }

    var allSubjects = db.Subjects.ToList();
    var allClassSections = db.ClassSections.ToList();

    if (!db.TeacherSubjectAssignments.Any() && teachers.Count >= 5)
    {
        foreach (var subject in allSubjects)
        {
            var teacher = subject.Name switch
            {
                "Mathematics" => teachers[0],
                "Biology" => teachers[1],
                "Informatics" => teachers[2],
                _ => teachers[3]
            };

            db.TeacherSubjectAssignments.Add(new TeacherSubjectAssignment
            {
                TeacherId = teacher.Id,
                SubjectId = subject.Id
            });
        }

        db.SaveChanges();
    }

    if (!db.TeacherClassAssignments.Any() && teachers.Count >= 5)
    {
        foreach (var classInfo in mockClasses)
        {
            var sectionRecord = allClassSections.First(section => section.Grade == classInfo.Grade && section.Section == classInfo.Section);
            var assignedTeacherIds = classInfo.Grade switch
            {
                8 => new[] { teachers[0].Id, teachers[3].Id },
                9 => new[] { teachers[1].Id, teachers[3].Id },
                10 => new[] { teachers[2].Id, teachers[4].Id },
                _ => new[] { teachers[0].Id }
            };

            foreach (var teacherId in assignedTeacherIds.Distinct())
            {
                db.TeacherClassAssignments.Add(new TeacherClassAssignment
                {
                    TeacherId = teacherId,
                    ClassSectionId = sectionRecord.Id
                });
            }
        }

        db.SaveChanges();
    }

    foreach (var classInfo in mockClasses)
    {
        var sectionRecord = db.ClassSections.First(section => section.Grade == classInfo.Grade && section.Section == classInfo.Section);
        if (sectionRecord.ClassTeacherId.HasValue)
        {
            continue;
        }

        sectionRecord.ClassTeacherId = classInfo.Grade switch
        {
            8 => teachers.ElementAtOrDefault(3)?.Id,
            9 => teachers.ElementAtOrDefault(1)?.Id,
            10 => teachers.ElementAtOrDefault(2)?.Id,
            _ => null
        };
    }

    db.SaveChanges();
}

app.Run();

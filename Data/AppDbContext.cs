using Microsoft.EntityFrameworkCore;
using EduPlatform.API.Models;

namespace EduPlatform.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<Grade> Grades => Set<Grade>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Test> Tests => Set<Test>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Answer> Answers => Set<Answer>();
    public DbSet<TestResult> TestResults => Set<TestResult>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
        .HasIndex(u => u.Username)
        .IsUnique();

        modelBuilder.Entity<User>()
        .HasIndex(u => u.Email)
        .IsUnique();

        // Seed роли
        modelBuilder.Entity<Role>().HasData(
            new Role { Id = 1, Name = "Student" },
            new Role { Id = 2, Name = "Teacher" },
            new Role { Id = 3, Name = "Admin" }
        );

        modelBuilder.Entity<User>().HasData(
        new User
        {
            Id = 1,
            Username = "admin",
            Email = "admin@test.com",
            PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin123!"),
            RoleId = 3 // Admin
        }
    );

        // Връзки
        modelBuilder.Entity<User>()
            .HasOne(u => u.Role)
            .WithMany(r => r.Users)
            .HasForeignKey(u => u.RoleId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Lesson>()
            .HasOne(l => l.Subject)
            .WithMany(s => s.Lessons)
            .HasForeignKey(l => l.SubjectId);

        modelBuilder.Entity<Lesson>()
            .HasOne(l => l.Grade)
            .WithMany(g => g.Lessons)
            .HasForeignKey(l => l.GradeId);

        modelBuilder.Entity<Test>()
            .HasOne(t => t.Lesson)
            .WithMany(l => l.Tests)
            .HasForeignKey(t => t.LessonId);

        modelBuilder.Entity<Question>()
            .HasOne(q => q.Test)
            .WithMany(t => t.Questions)
            .HasForeignKey(q => q.TestId);

        modelBuilder.Entity<Answer>()
            .HasOne(a => a.Question)
            .WithMany(q => q.Answers)
            .HasForeignKey(a => a.QuestionId);

        modelBuilder.Entity<TestResult>()
            .HasOne(tr => tr.User)
            .WithMany(u => u.TestResults)
            .HasForeignKey(tr => tr.UserId);

        modelBuilder.Entity<TestResult>()
            .HasOne(tr => tr.Test)
            .WithMany(t => t.TestResults) 
            .HasForeignKey(tr => tr.TestId);
    }
}
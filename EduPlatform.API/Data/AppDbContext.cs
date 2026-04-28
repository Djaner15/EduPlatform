using Microsoft.EntityFrameworkCore;
using EduPlatform.API.Models;

namespace EduPlatform.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<Subject> Subjects => Set<Subject>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<Test> Tests => Set<Test>();
    public DbSet<Question> Questions => Set<Question>();
    public DbSet<Answer> Answers => Set<Answer>();
    public DbSet<TestResult> TestResults => Set<TestResult>();
    public DbSet<TestResultAnswer> TestResultAnswers => Set<TestResultAnswer>();
    public DbSet<ClassSection> ClassSections => Set<ClassSection>();
    public DbSet<TeacherSubjectAssignment> TeacherSubjectAssignments => Set<TeacherSubjectAssignment>();
    public DbSet<TeacherClassAssignment> TeacherClassAssignments => Set<TeacherClassAssignment>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<User>()
            .Property(u => u.FullName)
            .HasMaxLength(120);

        modelBuilder.Entity<User>()
        .HasIndex(u => u.Username)
        .IsUnique();

        modelBuilder.Entity<User>()
        .HasIndex(u => u.Email)
        .IsUnique();

        modelBuilder.Entity<User>()
            .Property(u => u.Section)
            .HasMaxLength(1);

        modelBuilder.Entity<Subject>()
            .Property(s => s.Section)
            .HasMaxLength(1);

        modelBuilder.Entity<Lesson>()
            .Property(l => l.Section)
            .HasMaxLength(1);

        modelBuilder.Entity<Test>()
            .Property(t => t.Section)
            .HasMaxLength(1);

        modelBuilder.Entity<ClassSection>()
            .Property(c => c.Section)
            .HasMaxLength(1);

        modelBuilder.Entity<ClassSection>()
            .HasIndex(c => new { c.Grade, c.Section })
            .IsUnique();

        modelBuilder.Entity<TeacherSubjectAssignment>()
            .HasKey(x => new { x.TeacherId, x.SubjectId });

        modelBuilder.Entity<TeacherClassAssignment>()
            .HasKey(x => new { x.TeacherId, x.ClassSectionId });

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
            FullName = "System Administrator",
            Username = "admin",
            Email = "admin@test.com",
            PasswordHash = "$2a$11$9lfjmmIr/Z11LPdbBA73vONJxsylNnMgtMZs1swmkYvIiddyhVmY.",
            RoleId = 3, // Admin
            Grade = null,
            Section = null,
            IsApproved = true,
            ApprovedAt = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc)
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

        modelBuilder.Entity<Subject>()
            .HasOne(s => s.CreatedByUser)
            .WithMany(u => u.CreatedSubjects)
            .HasForeignKey(s => s.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Lesson>()
            .HasOne(l => l.CreatedByUser)
            .WithMany(u => u.CreatedLessons)
            .HasForeignKey(l => l.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Test>()
            .HasOne(t => t.Lesson)
            .WithMany(l => l.Tests)
            .HasForeignKey(t => t.LessonId);

        modelBuilder.Entity<Test>()
            .HasOne(t => t.CreatedByUser)
            .WithMany(u => u.CreatedTests)
            .HasForeignKey(t => t.CreatedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

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

        modelBuilder.Entity<TestResultAnswer>()
            .HasOne(tra => tra.TestResult)
            .WithMany(tr => tr.SubmittedAnswers)
            .HasForeignKey(tra => tra.TestResultId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ClassSection>()
            .HasOne(cs => cs.ClassTeacher)
            .WithMany(u => u.SupervisedClassSections)
            .HasForeignKey(cs => cs.ClassTeacherId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<TeacherSubjectAssignment>()
            .HasOne(ts => ts.Teacher)
            .WithMany(u => u.TeacherSubjectAssignments)
            .HasForeignKey(ts => ts.TeacherId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TeacherSubjectAssignment>()
            .HasOne(ts => ts.Subject)
            .WithMany(s => s.TeacherAssignments)
            .HasForeignKey(ts => ts.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TeacherClassAssignment>()
            .HasOne(tc => tc.Teacher)
            .WithMany(u => u.TeacherClassAssignments)
            .HasForeignKey(tc => tc.TeacherId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<TeacherClassAssignment>()
            .HasOne(tc => tc.ClassSection)
            .WithMany(cs => cs.TeacherAssignments)
            .HasForeignKey(tc => tc.ClassSectionId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

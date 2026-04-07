namespace EduPlatform.API.Models
{
    public class User
    {
        public int Id { get; set; }
        public string FullName { get; set; } = null!;
        public string Username { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string PasswordHash { get; set; } = null!;
        public int RoleId { get; set; }
        public int? Grade { get; set; }
        public string? Section { get; set; }
        public bool IsApproved { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public Role Role { get; set; } = null!;
        public ICollection<TestResult> TestResults { get; set; } = new List<TestResult>();
        public ICollection<Subject> CreatedSubjects { get; set; } = new List<Subject>();
        public ICollection<Lesson> CreatedLessons { get; set; } = new List<Lesson>();
        public ICollection<Test> CreatedTests { get; set; } = new List<Test>();
        public ICollection<TeacherSubjectAssignment> TeacherSubjectAssignments { get; set; } = new List<TeacherSubjectAssignment>();
        public ICollection<TeacherClassAssignment> TeacherClassAssignments { get; set; } = new List<TeacherClassAssignment>();
        public ICollection<ClassSection> SupervisedClassSections { get; set; } = new List<ClassSection>();
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPlatform.API.Migrations
{
    /// <inheritdoc />
    public partial class NormalizeExistingClassData : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE Lessons
                SET Grade = CASE Grade
                    WHEN 1 THEN 8
                    WHEN 2 THEN 9
                    WHEN 3 THEN 10
                    WHEN 4 THEN 11
                    WHEN 5 THEN 12
                    ELSE Grade
                END
                WHERE Grade BETWEEN 1 AND 5;
                """);

            migrationBuilder.Sql("""
                UPDATE Lessons
                SET Section = 'А'
                WHERE Section IS NULL OR TRIM(Section) = '';
                """);

            migrationBuilder.Sql("""
                UPDATE Subjects
                SET Grade = COALESCE(
                        (SELECT Lessons.Grade
                         FROM Lessons
                         WHERE Lessons.SubjectId = Subjects.Id
                         ORDER BY Lessons.Id
                         LIMIT 1),
                        CASE
                            WHEN Description LIKE '%12th%' THEN 12
                            WHEN Description LIKE '%11th%' THEN 11
                            WHEN Description LIKE '%10th%' THEN 10
                            WHEN Description LIKE '%9th%' THEN 9
                            ELSE 8
                        END),
                    Section = COALESCE(
                        (SELECT Lessons.Section
                         FROM Lessons
                         WHERE Lessons.SubjectId = Subjects.Id
                         ORDER BY Lessons.Id
                         LIMIT 1),
                        'А');
                """);

            migrationBuilder.Sql("""
                UPDATE Tests
                SET Grade = COALESCE(
                        (SELECT Lessons.Grade
                         FROM Lessons
                         WHERE Lessons.Id = Tests.LessonId
                         LIMIT 1),
                        8),
                    Section = COALESCE(
                        (SELECT Lessons.Section
                         FROM Lessons
                         WHERE Lessons.Id = Tests.LessonId
                         LIMIT 1),
                        'А');
                """);

            migrationBuilder.Sql("""
                UPDATE Users
                SET Grade = 8,
                    Section = 'А'
                WHERE RoleId = 1
                  AND (Grade IS NULL OR Section IS NULL);
                """);

            migrationBuilder.Sql("""
                UPDATE Users
                SET Grade = NULL,
                    Section = NULL
                WHERE RoleId <> 1;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPlatform.API.Migrations
{
    /// <inheritdoc />
    public partial class UseCyrillicClassSections : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                UPDATE Users
                SET Section = CASE UPPER(Section)
                    WHEN 'A' THEN 'А'
                    WHEN 'B' THEN 'Б'
                    WHEN 'C' THEN 'В'
                    WHEN 'D' THEN 'Г'
                    WHEN 'E' THEN 'Д'
                    WHEN 'F' THEN 'Е'
                    WHEN 'G' THEN 'Ж'
                    WHEN 'H' THEN 'З'
                    ELSE Section
                END
                WHERE Section IS NOT NULL;
                """);

            migrationBuilder.Sql("""
                UPDATE Subjects
                SET Section = CASE UPPER(Section)
                    WHEN 'A' THEN 'А'
                    WHEN 'B' THEN 'Б'
                    WHEN 'C' THEN 'В'
                    WHEN 'D' THEN 'Г'
                    WHEN 'E' THEN 'Д'
                    WHEN 'F' THEN 'Е'
                    WHEN 'G' THEN 'Ж'
                    WHEN 'H' THEN 'З'
                    ELSE Section
                END;
                """);

            migrationBuilder.Sql("""
                UPDATE Lessons
                SET Section = CASE UPPER(Section)
                    WHEN 'A' THEN 'А'
                    WHEN 'B' THEN 'Б'
                    WHEN 'C' THEN 'В'
                    WHEN 'D' THEN 'Г'
                    WHEN 'E' THEN 'Д'
                    WHEN 'F' THEN 'Е'
                    WHEN 'G' THEN 'Ж'
                    WHEN 'H' THEN 'З'
                    ELSE Section
                END;
                """);

            migrationBuilder.Sql("""
                UPDATE Tests
                SET Section = CASE UPPER(Section)
                    WHEN 'A' THEN 'А'
                    WHEN 'B' THEN 'Б'
                    WHEN 'C' THEN 'В'
                    WHEN 'D' THEN 'Г'
                    WHEN 'E' THEN 'Д'
                    WHEN 'F' THEN 'Е'
                    WHEN 'G' THEN 'Ж'
                    WHEN 'H' THEN 'З'
                    ELSE Section
                END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}

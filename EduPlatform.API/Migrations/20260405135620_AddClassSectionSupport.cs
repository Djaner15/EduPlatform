using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPlatform.API.Migrations
{
    /// <inheritdoc />
    public partial class AddClassSectionSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Lessons_Grades_GradeId",
                table: "Lessons");

            migrationBuilder.DropTable(
                name: "Grades");

            migrationBuilder.DropIndex(
                name: "IX_Lessons_GradeId",
                table: "Lessons");

            migrationBuilder.RenameColumn(
                name: "GradeId",
                table: "Lessons",
                newName: "Grade");

            migrationBuilder.AddColumn<int>(
                name: "Grade",
                table: "Users",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "Users",
                type: "TEXT",
                maxLength: 1,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Grade",
                table: "Tests",
                type: "INTEGER",
                nullable: false,
                defaultValue: 8);

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "Tests",
                type: "TEXT",
                maxLength: 1,
                nullable: false,
                defaultValue: "А");

            migrationBuilder.AddColumn<int>(
                name: "Grade",
                table: "Subjects",
                type: "INTEGER",
                nullable: false,
                defaultValue: 8);

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "Subjects",
                type: "TEXT",
                maxLength: 1,
                nullable: false,
                defaultValue: "А");

            migrationBuilder.AddColumn<string>(
                name: "Section",
                table: "Lessons",
                type: "TEXT",
                maxLength: 1,
                nullable: false,
                defaultValue: "А");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                columns: new[] { "Grade", "Section" },
                values: new object[] { null, null });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Grade",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "Grade",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "Grade",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "Section",
                table: "Lessons");

            migrationBuilder.RenameColumn(
                name: "Grade",
                table: "Lessons",
                newName: "GradeId");

            migrationBuilder.CreateTable(
                name: "Grades",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Name = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Grades", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_GradeId",
                table: "Lessons",
                column: "GradeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Lessons_Grades_GradeId",
                table: "Lessons",
                column: "GradeId",
                principalTable: "Grades",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EduPlatform.API.Migrations
{
    /// <inheritdoc />
    public partial class AddContentOwnershipRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "Tests",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "Subjects",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.AddColumn<int>(
                name: "CreatedByUserId",
                table: "Lessons",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$9lfjmmIr/Z11LPdbBA73vONJxsylNnMgtMZs1swmkYvIiddyhVmY.");

            migrationBuilder.CreateIndex(
                name: "IX_Tests_CreatedByUserId",
                table: "Tests",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Subjects_CreatedByUserId",
                table: "Subjects",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_Lessons_CreatedByUserId",
                table: "Lessons",
                column: "CreatedByUserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Lessons_Users_CreatedByUserId",
                table: "Lessons",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Subjects_Users_CreatedByUserId",
                table: "Subjects",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Tests_Users_CreatedByUserId",
                table: "Tests",
                column: "CreatedByUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Lessons_Users_CreatedByUserId",
                table: "Lessons");

            migrationBuilder.DropForeignKey(
                name: "FK_Subjects_Users_CreatedByUserId",
                table: "Subjects");

            migrationBuilder.DropForeignKey(
                name: "FK_Tests_Users_CreatedByUserId",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Tests_CreatedByUserId",
                table: "Tests");

            migrationBuilder.DropIndex(
                name: "IX_Subjects_CreatedByUserId",
                table: "Subjects");

            migrationBuilder.DropIndex(
                name: "IX_Lessons_CreatedByUserId",
                table: "Lessons");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Tests");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Subjects");

            migrationBuilder.DropColumn(
                name: "CreatedByUserId",
                table: "Lessons");

            migrationBuilder.UpdateData(
                table: "Users",
                keyColumn: "Id",
                keyValue: 1,
                column: "PasswordHash",
                value: "$2a$11$xGFxFxhg6aYC9qL0E9a5w.JAMQGUbfHXwZWs7R16hvPqN2BcSiSAS");
        }
    }
}

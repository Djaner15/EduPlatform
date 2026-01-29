using Microsoft.EntityFrameworkCore;
using EduPlatform.API.Models;

namespace EduPlatform.API.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options)
        : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
}
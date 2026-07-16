using System.Globalization;
using CarSales.Api.Data;
using CarSales.Api.Services;
using Microsoft.EntityFrameworkCore;

var cultureInfo = new CultureInfo("en-LK");
CultureInfo.DefaultThreadCurrentCulture = cultureInfo;
CultureInfo.DefaultThreadCurrentUICulture = cultureInfo;

var builder = WebApplication.CreateBuilder(args);

const string CorsPolicyName = "AllowLocalhostFrontend";
var frontendOrigin = builder.Configuration["FrontendOrigin"] ?? "http://localhost:5173";

builder.Services.AddOpenApi();
builder.Services.AddControllers();
builder.Services.AddCors(options =>
{
    options.AddPolicy(CorsPolicyName, policy =>
    {
        policy.WithOrigins(frontendOrigin)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? "Host=localhost;Port=5432;Database=carsalesdb;Username=postgres;Password=postgres";

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseNpgsql(connectionString));

builder.Services.AddScoped<CarsService>();
builder.Services.AddScoped<CustomersService>();
builder.Services.AddScoped<SalesService>();
builder.Services.AddScoped<ProcurementService>();
builder.Services.AddScoped<FinanceService>();
builder.Services.AddScoped<InventoryService>();
builder.Services.AddHttpClient("Ollama");
builder.Services.AddScoped<AiKernelService>();
builder.Services.AddScoped<AiToolService>();
builder.Services.AddScoped<AiAgentService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors(CorsPolicyName);
app.EnsureSeedData();

app.UseHttpsRedirection();
app.MapControllers();

app.Run();

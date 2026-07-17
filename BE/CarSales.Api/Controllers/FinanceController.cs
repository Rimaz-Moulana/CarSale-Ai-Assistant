using CarSales.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace CarSales.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class FinanceController : ControllerBase
{
    private readonly FinanceService _service;

    public FinanceController(FinanceService service)
    {
        _service = service;
    }

    [HttpGet("metrics")]
    public async Task<ActionResult<object>> GetFinanceMetrics()
    {
        var metrics = await _service.GetFinanceMetricsAsync();
        return Ok(metrics);
    }

    [HttpGet("charts")]
    public async Task<ActionResult<object>> GetFinanceCharts()
    {
        var monthlyProfit = await _service.GetFinanceChartsAsync();
        var cashFlowTrend = await _service.GetCashFlowTrendAsync();
        var expenseBreakdown = await _service.GetExpenseBreakdownAsync();

        return Ok(new
        {
            monthlyProfit,
            cashFlowTrend,
            expenseBreakdown
        });
    }

    [HttpGet("transactions")]
    public async Task<ActionResult<object>> GetRecentTransactions()
    {
        var transactions = await _service.GetRecentTransactionsAsync();
        return Ok(transactions);
    }

    [HttpGet("dashboard")]
    public async Task<ActionResult<object>> GetDashboardMetrics()
    {
        var dashboard = await _service.GetDashboardMetricsAsync();
        return Ok(dashboard);
    }
}


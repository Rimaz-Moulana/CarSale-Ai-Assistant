namespace CarSales.Api.Services;

public sealed record PaginatedResult<T>(IReadOnlyList<T> Data, int Total, int Page, int Limit);

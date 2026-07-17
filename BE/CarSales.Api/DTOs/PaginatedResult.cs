namespace CarSales.Api.DTOs;

public sealed record PaginatedResult<T>(IReadOnlyList<T> Data, int Total, int Page, int Limit);

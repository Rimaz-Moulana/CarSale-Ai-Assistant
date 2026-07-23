using System;

namespace CarSales.Api.DTOs;

public class CreatePurchaseOrderRequestDto
{
    public string Supplier { get; set; } = string.Empty;
    public string Status { get; set; } = "Pending";
    public DateTime ExpectedDelivery { get; set; }
    public decimal TotalCost { get; set; }
}

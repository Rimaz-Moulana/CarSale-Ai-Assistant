import { apiClient } from './apiClient';
import type { Sale, SalesMetrics, PaginatedResponse } from './types';

export class SalesService {
  private static endpoint = '/sales';

  static async getSalesMetrics(): Promise<SalesMetrics> {
    return apiClient.get<any, SalesMetrics>(`${this.endpoint}/metrics`);
  }

  static async getSalesList(page = 1, limit = 10, search = '', dateFilter = '', statusFilter = ''): Promise<PaginatedResponse<Sale>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(dateFilter && { date: dateFilter }),
      ...(statusFilter && statusFilter !== 'All' && { status: statusFilter }),
    });
    
    return apiClient.get<any, PaginatedResponse<Sale>>(`${this.endpoint}?${params}`);
  }

  static async createInvoice(saleData: Omit<Sale, 'id' | 'invoiceNo'>): Promise<Sale> {
    return apiClient.post<any, Sale>(this.endpoint, saleData);
  }
}

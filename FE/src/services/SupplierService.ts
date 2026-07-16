import { apiClient } from './apiClient';
import type { PurchaseOrder, PaginatedResponse } from './types';

export class SupplierService {
  private static endpoint = '/procurement';

  static async getProcurementMetrics(): Promise<any> {
    return apiClient.get<any, any>(`${this.endpoint}/metrics`);
  }

  static async getPurchaseOrders(page = 1, limit = 10, search = '', statusFilter = ''): Promise<PaginatedResponse<PurchaseOrder>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(statusFilter && statusFilter !== 'All' && { status: statusFilter }),
    });
    
    return apiClient.get<any, PaginatedResponse<PurchaseOrder>>(`${this.endpoint}?${params}`);
  }

  static async createPurchaseOrder(poData: Omit<PurchaseOrder, 'id' | 'poNumber'>): Promise<PurchaseOrder> {
    return apiClient.post<any, PurchaseOrder>(this.endpoint, poData);
  }
}

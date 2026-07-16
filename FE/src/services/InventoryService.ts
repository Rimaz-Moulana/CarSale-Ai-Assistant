import { apiClient } from './apiClient';
import type { InventoryItem, InventoryMetrics, PaginatedResponse } from './types';

export class InventoryService {
  private static endpoint = '/inventory';

  static async getInventoryMetrics(): Promise<InventoryMetrics> {
    return apiClient.get<any, InventoryMetrics>(`${this.endpoint}/metrics`);
  }

  static async getInventoryList(page = 1, limit = 10, search = '', locationFilter = ''): Promise<PaginatedResponse<InventoryItem>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(locationFilter && locationFilter !== 'All' && { location: locationFilter }),
    });
    
    return apiClient.get<any, PaginatedResponse<InventoryItem>>(`${this.endpoint}?${params}`);
  }

  static async updateInventoryStatus(id: string, status: string): Promise<InventoryItem> {
    return apiClient.patch<any, InventoryItem>(`${this.endpoint}/${id}/status`, { status });
  }
}

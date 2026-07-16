import { apiClient } from './apiClient';
import type { Customer, PaginatedResponse } from './types';

export class CustomerService {
  private static endpoint = '/customers';

  static async getCustomers(page = 1, limit = 10, search = ''): Promise<PaginatedResponse<Customer>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
    });
    
    return apiClient.get<any, PaginatedResponse<Customer>>(`${this.endpoint}?${params}`);
  }

  static async getCustomerById(id: string): Promise<Customer> {
    return apiClient.get<any, Customer>(`${this.endpoint}/${id}`);
  }

  static async createCustomer(customerData: Omit<Customer, 'id'>): Promise<Customer> {
    return apiClient.post<any, Customer>(this.endpoint, customerData);
  }
}

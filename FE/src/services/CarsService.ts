import { apiClient } from './apiClient';
import type { Car, PaginatedResponse } from './types';

export class CarsService {
  private static endpoint = '/cars';

  static async getCars(page = 1, limit = 10, search = '', statusFilter = ''): Promise<PaginatedResponse<Car>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(statusFilter && statusFilter !== 'All' && { status: statusFilter }),
    });
    
    return apiClient.get<any, PaginatedResponse<Car>>(`${this.endpoint}?${params}`);
  }

  static async getCarById(id: string): Promise<Car> {
    return apiClient.get<any, Car>(`${this.endpoint}/${id}`);
  }

  static async createCar(carData: Omit<Car, 'id'>): Promise<Car> {
    return apiClient.post<any, Car>(this.endpoint, carData);
  }

  static async updateCar(id: string, updates: Partial<Car>): Promise<Car> {
    return apiClient.put<any, Car>(`${this.endpoint}/${id}`, updates);
  }

  static async deleteCar(id: string): Promise<void> {
    return apiClient.delete(`${this.endpoint}/${id}`);
  }
}

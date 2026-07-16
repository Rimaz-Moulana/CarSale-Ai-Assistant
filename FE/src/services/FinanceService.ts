import { apiClient } from './apiClient';
import type { FinanceMetrics, Transaction } from './types';

export class FinanceService {
  private static endpoint = '/finance';

  static async getFinanceMetrics(): Promise<FinanceMetrics> {
    return apiClient.get<any, FinanceMetrics>(`${this.endpoint}/metrics`);
  }

  static async getFinanceCharts(): Promise<any> {
    return apiClient.get<any, any>(`${this.endpoint}/charts`);
  }

  static async getRecentTransactions(): Promise<Transaction[]> {
    return apiClient.get<any, Transaction[]>(`${this.endpoint}/transactions`);
  }

  static async getDashboardMetrics(): Promise<any> {
    return apiClient.get<any, any>(`${this.endpoint}/dashboard`);
  }
}

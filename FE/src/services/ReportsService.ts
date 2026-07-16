import { apiClient } from './apiClient';

export class ReportsService {
  private static endpoint = '/reports';

  static async getReportData(reportType: string): Promise<any> {
    return apiClient.get<any, any>(`${this.endpoint}?type=${reportType}`);
  }
}

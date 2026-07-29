import { apiClient } from './apiClient';
import type { CarImageVerification } from './types';

export interface DropboxFolder {
  name: string;
  path: string;
}

export class ImageVerificationService {
  private static endpoint = '/imageverification';

  static async getHistory(): Promise<CarImageVerification[]> {
    return apiClient.get<any, CarImageVerification[]>(`${this.endpoint}/history`);
  }

  static async verifyVehicle(carId: string | number): Promise<CarImageVerification> {
    return apiClient.post<any, CarImageVerification>(`${this.endpoint}/verify/${carId}`, {});
  }

  static async verifyAll(): Promise<CarImageVerification[]> {
    return apiClient.post<any, CarImageVerification[]>(`${this.endpoint}/verify-all`, {});
  }

  static async verifyFolder(folderPath: string, carId?: number): Promise<CarImageVerification> {
    return apiClient.post<any, CarImageVerification>(`${this.endpoint}/verify-folder`, { folderPath, carId });
  }

  static async verifyMatch(vin: string): Promise<any> {
    return apiClient.post<any, any>(`${this.endpoint}/verify-match/${encodeURIComponent(vin)}`, {});
  }

  static async getFolders(path: string = ""): Promise<DropboxFolder[]> {
    return apiClient.get<any, DropboxFolder[]>(`${this.endpoint}/folders?path=${encodeURIComponent(path)}`);
  }

  static async overrideStatus(id: number, status: 'Passed' | 'Failed' | 'Pending Review', notes: string): Promise<CarImageVerification> {
    return apiClient.post<any, CarImageVerification>(`${this.endpoint}/override/${id}`, { status, notes });
  }

  static async getFiles(chassisNumber: string): Promise<string[]> {
    return apiClient.get<any, string[]>(`${this.endpoint}/files/${chassisNumber}`);
  }

  static getImageUrl(chassisNumber: string, file: string): string {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5099';
    // Remove the '/api' suffix if present, because the controller path has '/api' built-in already
    const base = apiBase.endsWith('/api') ? apiBase.substring(0, apiBase.length - 4) : apiBase;
    return `${base}/api/imageverification/image?chassisNumber=${encodeURIComponent(chassisNumber)}&file=${encodeURIComponent(file)}`;
  }
}

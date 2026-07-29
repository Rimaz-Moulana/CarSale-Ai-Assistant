import { apiClient } from './apiClient';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
}

export interface AiChatResponse {
  content: string;
  sessionId: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: ChatMessage[];
}

export class AIChatService {
  private static endpoint = 'ai/sessions';

  static async getSessions(): Promise<ChatSession[]> {
    return apiClient.get<any, ChatSession[]>(this.endpoint);
  }

  static async getSession(id: string): Promise<ChatSession> {
    return apiClient.get<any, ChatSession>(`${this.endpoint}/${id}`);
  }

  static async createSession(): Promise<ChatSession> {
    return apiClient.post<any, ChatSession>(this.endpoint, {});
  }

  static async deleteSession(id: string): Promise<void> {
    return apiClient.delete<any, void>(`${this.endpoint}/${id}`);
  }

  static async sendMessage(message: string, sessionId?: string | null): Promise<AiChatResponse> {
    return apiClient.post<any, AiChatResponse>('ai/chat', {
      message,
      sessionId
    });
  }

  static async getProvider(): Promise<{ provider: string }> {
    return apiClient.get<any, { provider: string }>('ai/provider');
  }

  static async setProvider(provider: string): Promise<{ provider: string }> {
    return apiClient.post<any, { provider: string }>('ai/provider', { provider });
  }
}

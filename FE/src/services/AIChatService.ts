import { apiClient } from './apiClient';
import type { ChatMessage } from './types';

interface AiChatResponse {
  content: string;
}

export class AIChatService {
  private static endpoint = 'ai/chat';

  static async sendMessage(message: string, history: ChatMessage[] = []): Promise<AiChatResponse> {
    return apiClient.post<any, AiChatResponse>(this.endpoint, {
      message,
      history: history.map(({ role, content }) => ({ role, content }))
    });
  }

  static async getChatHistory(): Promise<{ id: string, title: string }[]> {
    return apiClient.get<any, any[]>(`${this.endpoint}/history`);
  }
}

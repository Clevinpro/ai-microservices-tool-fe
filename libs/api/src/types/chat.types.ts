export interface IChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IChatRequest {
  message: string;
  conversationId?: string;
}

export interface IChatResponse {
  userId: string;
  result: string;
}

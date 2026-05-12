import { apiClient, getApiBaseURL } from '../client';
import type { IChatRequest, IChatResponse } from '../types/chat.types';

const CHAT_STREAM_PATH = '/ai/chat/stream';

export async function sendMessage(dto: IChatRequest): Promise<IChatResponse> {
  const { data } = await apiClient.post<IChatResponse>('/ai/chat', dto);
  return data;
}

export function streamMessage(message: string): EventSource {
  const base = getApiBaseURL().replace(/\/$/, '');
  const url = new URL(`${base}${CHAT_STREAM_PATH}`);
  url.searchParams.set('message', message);
  return new EventSource(url.toString(), { withCredentials: true });
}

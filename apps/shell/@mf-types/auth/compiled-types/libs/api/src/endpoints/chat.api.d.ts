import type { IChatRequest, IChatResponse } from '../types/chat.types';
export declare function sendMessage(dto: IChatRequest): Promise<IChatResponse>;
export declare function streamMessage(message: string): EventSource;

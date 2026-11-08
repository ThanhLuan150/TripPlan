import {api} from '@/lib/apiClient';
import type {ChatMessageDto, ChatSummary, SendMessageResponse} from '../types';

export const CHAT_SUCCESS = 'Send message successfully';
export const CHAT_ERROR = 'Đã xảy ra lỗi trong quá trình gửi tin nhắn, thử lại';

export const chatApi = {
  send: async (message: string, idChat: string | null) =>
    (await api.post<SendMessageResponse>('/chat', {message, idChat})).data,

  // the user's conversations, most recent first
  list: async () => (await api.get<{data: ChatSummary[]}>('/chat')).data.data ?? [],

  // messages of one conversation, oldest first
  messages: async (id: string): Promise<ChatMessageDto[]> => {
    const body = (
      await api.get<{
        messages?: ChatMessageDto[];
        questions?: {content: string; createdAt: string}[];
        responses?: {content: string; createdAt: string}[];
      }>(`/chat/${id}`)
    ).data;
    if (body.messages) {
      return body.messages;
    }
    // older backend: merge questions and answers by time
    return [
      ...(body.questions ?? []).map(q => ({role: 'user' as const, text: q.content, createdAt: q.createdAt})),
      ...(body.responses ?? []).map(r => ({role: 'model' as const, text: r.content, createdAt: r.createdAt})),
    ].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt));
  },

  remove: async (id: string) => (await api.delete(`/chat/${id}`)).data,
};

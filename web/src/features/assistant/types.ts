// A chat bubble. Built-in messages store an i18n key so they follow the
// selected language; messages from the user / the AI store the text.
export interface Message {
  type: 'bot' | 'user';
  text?: string;
  i18nKey?: string;
  error: boolean;
}

export interface ChatSummary {
  _id: string;
  title?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessageDto {
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

export interface SendMessageResponse {
  message: string;
  data?: {ChatResponse: string; chatAi?: {_id: string}};
  chatAi?: {_id: string};
}

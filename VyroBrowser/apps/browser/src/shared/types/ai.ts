export type AIRole = 'user' | 'assistant' | 'system';

export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIRole;
  content: string;
  tokenCount: number | null;
  createdAt: number;
}

export interface AIConversation {
  id: string;
  profileId: string;
  title: string;
  model: string;
  systemPrompt: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface OllamaModel {
  name: string;
  size: number;
  modifiedAt: string;
}

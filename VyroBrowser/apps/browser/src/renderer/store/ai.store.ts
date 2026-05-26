import { create } from 'zustand';
import { AIConversation, AIMessage } from '@shared/types/ai';

interface AIStore {
  conversations: AIConversation[];
  activeConversationId: string | null;
  messages: Record<string, AIMessage[]>;
  streamingContent: Record<string, string>;
  isStreaming: boolean;
  model: string;
  setConversations: (c: AIConversation[]) => void;
  setActiveConversation: (id: string | null) => void;
  setMessages: (conversationId: string, msgs: AIMessage[]) => void;
  addUserMessage: (conversationId: string, content: string) => void;
  appendChunk: (conversationId: string, delta: string) => void;
  finalizeStream: (conversationId: string) => void;
  setStreaming: (v: boolean) => void;
  setModel: (m: string) => void;
}

export const useAIStore = create<AIStore>((set) => ({
  conversations: [],
  activeConversationId: null,
  messages: {},
  streamingContent: {},
  isStreaming: false,
  model: 'qwen2.5-coder:7b',

  setConversations: (conversations) => set({ conversations }),
  setActiveConversation: (activeConversationId) => set({ activeConversationId }),
  setMessages: (conversationId, msgs) =>
    set(s => ({ messages: { ...s.messages, [conversationId]: msgs } })),

  addUserMessage: (conversationId, content) => set(s => {
    const msg: AIMessage = {
      id: `local-${Date.now()}`,
      conversationId,
      role: 'user',
      content,
      tokenCount: null,
      createdAt: Math.floor(Date.now() / 1000),
    };
    return {
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), msg],
      },
    };
  }),

  appendChunk: (conversationId, delta) => set(s => ({
    streamingContent: {
      ...s.streamingContent,
      [conversationId]: (s.streamingContent[conversationId] ?? '') + delta,
    },
  })),

  finalizeStream: (conversationId) => set(s => {
    const finalContent = s.streamingContent[conversationId] ?? '';
    const newMsg: AIMessage = {
      id: `assistant-${Date.now()}`,
      conversationId,
      role: 'assistant',
      content: finalContent,
      tokenCount: null,
      createdAt: Math.floor(Date.now() / 1000),
    };
    return {
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), newMsg],
      },
      streamingContent: { ...s.streamingContent, [conversationId]: '' },
      isStreaming: false,
    };
  }),

  setStreaming: (isStreaming) => set({ isStreaming }),
  setModel: (model) => set({ model }),
}));

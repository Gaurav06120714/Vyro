import { useEffect, useCallback } from 'react';
import { ipc, IPC } from '../lib/ipc';
import { useAIStore } from '../store/ai.store';
import { useUiStore } from '../store/ui.store';
import { useTabsStore } from '../store/tabs.store';
import { AIConversation, AIMessage, OllamaModel } from '@shared/types/ai';

export function useAI() {
  const store = useAIStore();
  const addToast = useUiStore(s => s.addToast);
  const activeTab = useTabsStore(s => s.activeTab());

  useEffect(() => {
    // Load conversations
    ipc.invoke<AIConversation[]>(IPC.AI_CONVERSATION_GET_ALL)
      .then(store.setConversations)
      .catch(console.error);

    // Subscribe to AI chunks
    const offChunk = ipc.on(IPC.AI_CHUNK, (...args: unknown[]) => {
      const { conversationId, delta, done } = args[0] as { conversationId: string; delta: string; done: boolean };
      if (done) {
        store.finalizeStream(conversationId);
      } else {
        store.appendChunk(conversationId, delta);
      }
    });

    // Subscribe to AI errors
    const offError = ipc.on(IPC.AI_ERROR, (...args: unknown[]) => {
      const { message } = args[0] as { conversationId: string; message: string };
      store.setStreaming(false);
      addToast(`AI error: ${message}`, 'error');
    });

    return () => {
      offChunk();
      offError();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load messages when active conversation changes
  useEffect(() => {
    if (store.activeConversationId) {
      ipc.invoke<AIMessage[]>(IPC.AI_MESSAGES_GET, { conversationId: store.activeConversationId })
        .then(msgs => store.setMessages(store.activeConversationId!, msgs))
        .catch(console.error);
    }
  }, [store.activeConversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  const createConversation = useCallback(async (): Promise<AIConversation> => {
    const conv = await ipc.invoke<AIConversation>(IPC.AI_CONVERSATION_CREATE, {
      model: store.model,
    });
    const convs = await ipc.invoke<AIConversation[]>(IPC.AI_CONVERSATION_GET_ALL);
    store.setConversations(convs);
    store.setActiveConversation(conv.id);
    return conv;
  }, [store]);

  const selectConversation = useCallback((id: string) => {
    store.setActiveConversation(id);
  }, [store]);

  const deleteConversation = useCallback(async (id: string) => {
    await ipc.invoke(IPC.AI_CONVERSATION_DELETE, { id });
    const convs = await ipc.invoke<AIConversation[]>(IPC.AI_CONVERSATION_GET_ALL);
    store.setConversations(convs);
    if (store.activeConversationId === id) {
      store.setActiveConversation(convs[0]?.id ?? null);
    }
  }, [store]);

  const sendMessage = useCallback(async (content: string) => {
    let convId = store.activeConversationId;
    if (!convId) {
      const conv = await createConversation();
      convId = conv.id;
    }
    store.addUserMessage(convId, content);
    store.setStreaming(true);
    await ipc.invoke(IPC.AI_SEND, { conversationId: convId, content, model: store.model });
  }, [store, createConversation]);

  const summarizePage = useCallback(async () => {
    if (!activeTab) return;
    let convId = store.activeConversationId;
    if (!convId) {
      const conv = await createConversation();
      convId = conv.id;
    }
    // Get page text via webContents would require IPC, use a placeholder here
    const pageText = `Page: ${activeTab.title} — ${activeTab.url}`;
    store.setStreaming(true);
    await ipc.invoke(IPC.AI_SUMMARIZE_PAGE, { conversationId: convId, pageText, model: store.model });
  }, [store, createConversation, activeTab]);

  const abortStreaming = useCallback(() => {
    if (store.activeConversationId) {
      ipc.invoke(IPC.AI_ABORT, { conversationId: store.activeConversationId });
      store.setStreaming(false);
    }
  }, [store]);

  const listModels = useCallback((): Promise<OllamaModel[]> => {
    return ipc.invoke<OllamaModel[]>(IPC.AI_MODELS_LIST);
  }, []);

  return {
    conversations: store.conversations,
    activeConversationId: store.activeConversationId,
    messages: store.messages,
    streamingContent: store.streamingContent,
    isStreaming: store.isStreaming,
    model: store.model,
    setModel: store.setModel,
    createConversation,
    selectConversation,
    deleteConversation,
    sendMessage,
    summarizePage,
    abortStreaming,
    listModels,
  };
}

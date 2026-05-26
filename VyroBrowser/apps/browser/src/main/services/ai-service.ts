import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import http from 'http';
import { AIConversation, AIMessage, OllamaModel } from '../../shared/types/ai';
import { syncAIConversationCreate, syncAIConversationDelete, syncAIMessageAdd } from './sync-service';
import { inferenceCache } from './inference-cache';

export class AIService {
  private abortControllers = new Map<string, () => void>();

  constructor(
    private db: Database.Database,
    private getOllamaUrl: () => string,
  ) {}

  async listModels(): Promise<OllamaModel[]> {
    return new Promise((resolve) => {
      try {
        const rawUrl = this.getOllamaUrl();
        const url = new URL(rawUrl);
        const req = http.get({
          hostname: url.hostname,
          port: parseInt(url.port) || 11434,
          path: '/api/tags',
        }, (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data) as { models?: { name: string; size: number; modified_at: string }[] };
              resolve((parsed.models ?? []).map(m => ({
                name: m.name,
                size: m.size,
                modifiedAt: m.modified_at,
              })));
            } catch { resolve([]); }
          });
        });
        req.on('error', () => resolve([]));
        req.end();
      } catch {
        resolve([]);
      }
    });
  }

  createConversation(profileId: string, model: string, systemPrompt?: string): AIConversation {
    const id = uuidv4();
    const now = Math.floor(Date.now() / 1000);
    this.db.prepare(
      'INSERT INTO ai_conversations (id, profile_id, title, model, system_prompt, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(id, profileId, 'New Chat', model, systemPrompt ?? null, now, now);
    const conv: AIConversation = { id, profileId, title: 'New Chat', model, systemPrompt: systemPrompt ?? null, createdAt: now, updatedAt: now };
    syncAIConversationCreate({ id, profile_id: profileId, title: 'New Chat', model, system_prompt: systemPrompt ?? null, created_at: now, updated_at: now });
    return conv;
  }

  getConversations(profileId: string): AIConversation[] {
    return (this.db.prepare(
      'SELECT * FROM ai_conversations WHERE profile_id = ? ORDER BY updated_at DESC'
    ).all(profileId) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      profileId: r.profile_id as string,
      title: r.title as string,
      model: r.model as string,
      systemPrompt: r.system_prompt as string | null,
      createdAt: r.created_at as number,
      updatedAt: r.updated_at as number,
    }));
  }

  deleteConversation(id: string): void {
    this.db.prepare('DELETE FROM ai_conversations WHERE id = ?').run(id);
    syncAIConversationDelete(id);
  }

  getMessages(conversationId: string): AIMessage[] {
    return (this.db.prepare(
      'SELECT * FROM ai_messages WHERE conversation_id = ? ORDER BY created_at ASC'
    ).all(conversationId) as Record<string, unknown>[]).map(r => ({
      id: r.id as string,
      conversationId: r.conversation_id as string,
      role: r.role as 'user' | 'assistant' | 'system',
      content: r.content as string,
      tokenCount: r.token_count as number | null,
      createdAt: r.created_at as number,
    }));
  }

  async sendMessage(
    conversationId: string,
    userContent: string,
    model: string,
    onChunk: (delta: string, done: boolean) => void,
  ): Promise<void> {
    const msgId = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    this.db.prepare(
      'INSERT INTO ai_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(msgId, conversationId, 'user', userContent, now);
    syncAIMessageAdd({ id: msgId, conversation_id: conversationId, role: 'user', content: userContent, created_at: now });

    const messages = this.getMessages(conversationId);
    const conv = this.db.prepare('SELECT * FROM ai_conversations WHERE id = ?').get(conversationId) as Record<string, unknown> | undefined;

    const messagesPayload = [
      ...(conv?.system_prompt ? [{ role: 'system', content: conv.system_prompt }] : []),
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    // Check inference cache first
    const cacheKey = inferenceCache.key(model, messagesPayload);
    const cached = inferenceCache.get(cacheKey);
    if (cached) {
      // Stream cached response character by character
      const aId = uuidv4();
      const aNow = Math.floor(Date.now() / 1000);
      this.db.prepare(
        'INSERT INTO ai_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
      ).run(aId, conversationId, 'assistant', cached, aNow);
      syncAIMessageAdd({ id: aId, conversation_id: conversationId, role: 'assistant', content: cached, created_at: aNow });
      // Deliver in chunks
      const chunkSize = 4;
      for (let i = 0; i < cached.length; i += chunkSize) {
        onChunk(cached.slice(i, i + chunkSize), false);
      }
      onChunk('', true);
      return Promise.resolve();
    }

    const payload = JSON.stringify({
      model,
      messages: messagesPayload,
      stream: true,
    });

    return new Promise((resolve, reject) => {
      let assistantContent = '';

      try {
        const ollamaUrl = new URL(this.getOllamaUrl());

        const req = http.request({
          hostname: ollamaUrl.hostname,
          port: parseInt(ollamaUrl.port) || 11434,
          path: '/api/chat',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
          },
        }, (res) => {
          res.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n').filter(Boolean);
            for (const line of lines) {
              try {
                const obj = JSON.parse(line) as { message?: { content?: string }; done?: boolean };
                if (obj.message?.content) {
                  assistantContent += obj.message.content;
                  onChunk(obj.message.content, false);
                }
                if (obj.done) {
                  const aId = uuidv4();
                  const aNow = Math.floor(Date.now() / 1000);
                  this.db.prepare(
                    'INSERT INTO ai_messages (id, conversation_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
                  ).run(aId, conversationId, 'assistant', assistantContent, aNow);
                  syncAIMessageAdd({ id: aId, conversation_id: conversationId, role: 'assistant', content: assistantContent, created_at: aNow });
                  // Store in inference cache
                  if (assistantContent) {
                    inferenceCache.set(cacheKey, assistantContent);
                  }

                  if (conv?.title === 'New Chat') {
                    const title = userContent.slice(0, 50);
                    this.db.prepare('UPDATE ai_conversations SET title = ?, updated_at = unixepoch() WHERE id = ?')
                      .run(title, conversationId);
                  }

                  this.abortControllers.delete(conversationId); // cleanup on success
                  onChunk('', true);
                  resolve();
                }
              } catch { /* ignore malformed JSON */ }
            }
          });
          res.on('error', (err) => {
            this.abortControllers.delete(conversationId); // cleanup on error
            reject(err);
          });
          res.on('end', () => {
            this.abortControllers.delete(conversationId); // cleanup on end
            if (assistantContent && !assistantContent.endsWith('\n')) {
              resolve();
            }
          });
        });

        req.on('error', (err) => {
          this.abortControllers.delete(conversationId); // cleanup on request error
          reject(err);
        });

        const abort = () => { req.destroy(); };
        this.abortControllers.set(conversationId, abort);

        req.write(payload);
        req.end();
      } catch (err) {
        this.abortControllers.delete(conversationId); // cleanup on sync error
        reject(err);
      }
    });
  }

  abort(conversationId: string): void {
    this.abortControllers.get(conversationId)?.();
    this.abortControllers.delete(conversationId);
  }

  abortAll(): void {
    for (const abort of this.abortControllers.values()) {
      try { abort(); } catch { /* ignore */ }
    }
    this.abortControllers.clear();
  }
}

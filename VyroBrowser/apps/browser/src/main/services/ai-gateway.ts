// ─────────────────────────────────────────────────────────────────────────────
// ai-gateway.ts — Local HTTP server on port 4003 that proxies Ollama requests
// from any localhost Next.js app with CORS headers.
// ─────────────────────────────────────────────────────────────────────────────
import http from 'http';
import { ollamaManager } from './ollama-manager';

const OLLAMA_HOST = 'localhost';
const OLLAMA_PORT = 11434;
const GATEWAY_PORT = 4003;

const ALLOWED_ORIGINS = new Set([
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3005',
  'http://localhost:3007',
  'http://localhost:5173',
]);

function corsHeaders(origin?: string): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'http://localhost:5173';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
}

export class AIGateway {
  private server: http.Server | null = null;

  start(): void {
    this.server = http.createServer((req, res) => {
      const origin = req.headers.origin;
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => res.setHeader(k, v));

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = req.url ?? '/';

      if (req.method === 'GET' && url === '/health') {
        this.handleHealth(res);
      } else if (req.method === 'POST' && url === '/chat') {
        this.proxyToOllama(req, res, '/api/chat');
      } else if (req.method === 'POST' && url === '/generate') {
        this.proxyToOllama(req, res, '/api/generate');
      } else if (req.method === 'POST' && url === '/embed') {
        this.handleEmbed(req, res);
      } else if (req.method === 'GET' && url === '/models') {
        this.handleModels(res);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    this.server.listen(GATEWAY_PORT, '127.0.0.1', () => {
      console.log(`[AI Gateway] Listening on http://127.0.0.1:${GATEWAY_PORT}`);
    });

    this.server.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EADDRINUSE') {
        console.warn('[AI Gateway] Port 4003 already in use — gateway not started');
      } else {
        console.error('[AI Gateway] Server error:', err);
      }
    });
  }

  stop(): void {
    this.server?.close();
    this.server = null;
  }

  private async handleHealth(res: http.ServerResponse): Promise<void> {
    try {
      const models = await ollamaManager.listModels();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ollama: true, models }));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, ollama: false, models: [] }));
    }
  }

  private proxyToOllama(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    ollamaPath: string,
  ): void {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);

      const proxyReq = http.request(
        {
          hostname: OLLAMA_HOST,
          port: OLLAMA_PORT,
          path: ollamaPath,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': body.length,
          },
        },
        (proxyRes) => {
          res.writeHead(proxyRes.statusCode ?? 200, {
            'Content-Type': proxyRes.headers['content-type'] ?? 'application/json',
            'Transfer-Encoding': 'chunked',
            ...corsHeaders(),
          });
          proxyRes.pipe(res);
        },
      );

      proxyReq.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Ollama not available' }));
        }
      });

      proxyReq.write(body);
      proxyReq.end();
    });
  }

  private handleEmbed(req: http.IncomingMessage, res: http.ServerResponse): void {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString()) as {
          model?: string;
          prompt: string;
        };
        const ollamaBody = JSON.stringify({
          model: body.model ?? 'nomic-embed-text',
          prompt: body.prompt,
        });

        const proxyReq = http.request(
          {
            hostname: OLLAMA_HOST,
            port: OLLAMA_PORT,
            path: '/api/embeddings',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(ollamaBody),
            },
          },
          (proxyRes) => {
            let data = '';
            proxyRes.on('data', (chunk: Buffer) => {
              data += chunk.toString();
            });
            proxyRes.on('end', () => {
              try {
                const parsed = JSON.parse(data) as { embedding?: number[] };
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ embedding: parsed.embedding ?? [] }));
              } catch {
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Parse error' }));
              }
            });
          },
        );

        proxyReq.on('error', () => {
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Ollama not available' }));
          }
        });
        proxyReq.write(ollamaBody);
        proxyReq.end();
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid request body' }));
      }
    });
  }

  private async handleModels(res: http.ServerResponse): Promise<void> {
    try {
      const models = await ollamaManager.listModels();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ models }));
    } catch {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Ollama not available' }));
    }
  }
}

export const aiGateway = new AIGateway();

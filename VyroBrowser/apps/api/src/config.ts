import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  DATABASE_PATH: z.string().default('./vyro.db'),

  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('llama3.1:8b'),

  BROWSER_HEADLESS: z.coerce.boolean().default(false),
  BROWSER_MAX_SESSIONS: z.coerce.number().default(5),
  BROWSER_TIMEOUT_MS: z.coerce.number().default(30000),
  BROWSER_NAVIGATION_TIMEOUT_MS: z.coerce.number().default(60000),
  PLAYWRIGHT_BROWSERS_PATH: z.string().optional(),

  WORKER_CONCURRENCY: z.coerce.number().default(5),

  ALLOWED_DOMAINS: z.string().default('*'),
  BLOCKED_DOMAINS: z.string().default('localhost,127.0.0.1'),

  API_URL: z.string().default('http://localhost:3001'),
});

export type Config = z.infer<typeof envSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (_config) return _config;

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }

  _config = result.data;
  return _config;
}

export function getAllowedDomains(): string[] {
  const config = getConfig();
  return config.ALLOWED_DOMAINS.split(',').map((d) => d.trim()).filter(Boolean);
}

export function getBlockedDomains(): string[] {
  const config = getConfig();
  return config.BLOCKED_DOMAINS.split(',').map((d) => d.trim()).filter(Boolean);
}

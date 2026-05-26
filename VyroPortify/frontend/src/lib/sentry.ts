import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

let initialized = false;

export function initSentry() {
  if (initialized) return;
  if (!SENTRY_DSN) return;

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    debug: false,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
  });

  initialized = true;
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!SENTRY_DSN) {
    console.error(error);
    return;
  }
  Sentry.captureException(error, { extra: context });
}

export function setUser(id: string, email?: string) {
  if (!SENTRY_DSN) return;
  Sentry.setUser({ id, email });
}

export function clearUser() {
  if (!SENTRY_DSN) return;
  Sentry.setUser(null);
}

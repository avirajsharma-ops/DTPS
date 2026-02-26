import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
    
    // Pre-warm MongoDB connection on server startup so the first request is fast
    try {
      const { default: connectDB } = await import("@/lib/db/connection");
      connectDB().then(() => {
        console.log('[Instrumentation] MongoDB connection pre-warmed');
      }).catch((err: Error) => {
        console.warn('[Instrumentation] MongoDB pre-warm failed (will retry on first request):', err.message);
      });
    } catch {
      // Silently ignore — connection will be established on first request
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;

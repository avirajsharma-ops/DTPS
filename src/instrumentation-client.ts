// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://b5f92cdff84e96999e2ad9fabe4ab77d@o4510792436023296.ingest.de.sentry.io/4510861191479376",

  // Replay is lazy-loaded only when needed (saves ~118KB from initial bundle)
  integrations: [],

  // Sample 20% of transactions in production (was 100%)
  tracesSampleRate: 0.2,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Replay is loaded lazily below — these rates still apply
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: true,
});

// Lazy-load Sentry Replay only for admin/staff users (not client WebView users)
// This keeps ~118KB of rrweb out of the initial bundle
if (typeof window !== 'undefined') {
  // Defer replay loading until after page is interactive
  const loadReplayIfNeeded = () => {
    try {
      // Skip for native app users (Android/iOS WebView) — they don't need session replay
      const ua = navigator.userAgent || '';
      if (ua.includes('NativeApp') || ua.includes('DTPSApp')) return;

      // Only load for admin paths (staff debugging)
      const path = window.location.pathname;
      if (path.startsWith('/admin') || path.startsWith('/dashboard')) {
        Sentry.lazyLoadIntegration('replayIntegration').then((replay) => {
          Sentry.addIntegration(replay());
        }).catch(() => {});
      }
    } catch {}
  };

  if (document.readyState === 'complete') {
    setTimeout(loadReplayIfNeeded, 3000);
  } else {
    window.addEventListener('load', () => setTimeout(loadReplayIfNeeded, 3000), { once: true });
  }
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

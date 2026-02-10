# Copilot instructions (DTPS)

## Project overview
- Next.js App Router app with multi-role UI (admin/dietitian/health-counselor/client) in src/app; role gating + onboarding redirects live in middleware.ts.
- Backend uses App Router API routes under src/app/api/** with NextAuth sessions + MongoDB (Mongoose).
- A native mobile shell exists in mobile-app/ (iOS/Android) that wraps the web app via WebView.

## Architecture & data flow
- Database access is via the singleton connection in src/lib/db/connection.ts; API routes should call connectDB() once per request and reuse registered models in src/lib/db/models/**.
- Authentication is centralized in src/lib/auth/config.ts (Credentials + Google). JWT carries role + onboarding flags consumed by middleware.ts.
- Base URL generation must use getBaseUrl()/getPaymentCallbackUrl() in src/lib/config.ts (avoid direct NEXTAUTH_URL in API routes).
- Middleware adds X-App-Version and no-store headers for API routes, and enforces client onboarding redirects.

## API route conventions
- Standard flow: getServerSession(authOptions) ➜ connectDB() ➜ query Mongoose models ➜ NextResponse.json(). Examples: src/app/api/analytics/stats/route.ts, src/app/api/users/route.ts.
- Prefer withAPIHandler/errorResponse helpers in src/lib/api/utils.ts for consistent auth, DB connect with timeout, and response shape.
- Caching uses withCache/clearCacheByTag (src/lib/cache/memoryCache.ts). Conditional caching/ETag is for admin/internal APIs only; avoid caching user-facing routes like /api/client/**.
- Health checks are exposed via src/app/api/health/route.ts.

## Realtime & messaging
- Realtime updates use SSE via src/lib/realtime/sse-manager.ts and related API routes (messages, unread counts). Prefer SSE over polling when adding live updates.

## Mobile app shell (iOS)
- WebView wrapper loads https://dtps.tech/user, uses a custom user agent, and JS → native bridges in mobile-app/ios/DTPS/MainViewController.swift.
- Shared WKProcessPool warm-up lives in mobile-app/ios/DTPS/AppDelegate.swift; keep new WKWebView instances on that pool.
- Deep links/notification taps are relayed via NotificationCenter (see Notification.Name extensions in AppDelegate.swift).

## Key workflows
- Local dev: npm run dev. Build: npm run build. Start: npm run start. Lint: npm run lint. (See package.json.)
- Production container flow uses docker-compose.prod.yml + Dockerfile (app + nginx). Healthcheck targets /api/health.
- Environment is loaded from .env.local in production compose; keep NEXTAUTH_URL aligned with production domain.

## UI patterns
- Global providers live in src/app/layout.tsx (SessionProvider, ThemeProvider, PushNotificationProvider). Add app-wide providers here.
- Client panel architecture and routes are documented in USER_PANEL_README.md; use it as the map for client-facing pages.

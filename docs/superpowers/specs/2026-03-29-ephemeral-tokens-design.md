# Ephemeral Token Migration

Replace the Railway WebSocket proxy with Gemini ephemeral tokens, enabling direct browser-to-Gemini connections and Vercel-only deployment.

## Background

The app currently requires two deployments:
- **Vercel**: Next.js frontend + text API routes
- **Railway**: WebSocket proxy (`server/gemini-live-proxy.ts`) that relays audio between browser and Gemini Live API, keeping `GEMINI_API_KEY` server-side

Gemini's ephemeral tokens allow the browser to connect directly to the Live API using a short-lived, single-use credential, eliminating the need for the proxy.

## Architecture

**Before:** `Browser -> Railway WebSocket Proxy -> Gemini Live API`
**After:** `Browser -> Gemini Live API (direct, using ephemeral token)`

Token provisioning flow:
1. Client calls `POST /api/token` with `{ documentId, language, readingLevel }`
2. API route creates an ephemeral token via Gemini provisioning API using `GEMINI_API_KEY`
3. API route fetches document text from Supabase, builds system prompt
4. Returns `{ token, systemPrompt, voiceConfig }` to client
5. Client opens WebSocket directly to Gemini using the ephemeral token
6. Client sends setup message with system prompt, then streams audio

The system prompt (including document text) is visible client-side. This is acceptable since it is the user's own document.

## New Files

### `/lib/voice-config.ts`
Shared module extracted from the proxy containing:
- `LANGUAGE_CODES` map (display name -> BCP-47 code)
- `getLanguageCode(language?: string): string`
- `getReadingLevelInstruction(level?: number): string`
- `buildSystemPrompt(language?: string, readingLevel?: number): string`

These functions are used by the API route to construct the system prompt server-side.

### `/app/api/token/route.ts`
Next.js API route handler (`POST`):
- Validates request body (`documentId` required)
- Creates ephemeral token via Gemini API: `POST https://generativelanguage.googleapis.com/v1alpha/auth_tokens` with `uses: 1`, `expire_time: now + 30 minutes`
- Fetches document `raw_text` from Supabase (capped at 8000 chars, matching current behavior)
- Builds system prompt using `buildSystemPrompt()` + document text
- Returns JSON: `{ token, systemPrompt, languageCode, voiceName: "Puck" }`
- Returns 404 if document not found, 500 if token creation fails

## Modified Files

### `/lib/gemini-live.ts`
Changes to `GeminiLiveClient.connect()`:
- Before opening WebSocket, calls `POST /api/token` to get ephemeral token + config
- Connects directly to `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?access_token=TOKEN`
- On WebSocket open, sends setup message with model config, voice config, and system prompt (all received from API route)
- Handles `setupComplete` directly (replaces proxy's `{ type: "ready" }` message)
- All audio handling (PCM encoding, playback queue, interruption) stays identical

### `/package.json`
- Remove `dev:proxy` and `start:proxy` scripts
- Remove `ws` dependency (only used by the proxy server)
- Remove `dotenv` dependency (only used by the proxy server)

## Deleted Files

- `server/gemini-live-proxy.ts` — replaced by `/app/api/token/route.ts` + direct client connection
- `railway.json` — no longer deploying to Railway

## Environment Variables

**Removed:**
- `NEXT_PUBLIC_PROXY_URL` — no proxy to connect to
- `PROXY_PORT` — no proxy server

**Unchanged:**
- `GEMINI_API_KEY` — now used by the token API route instead of the proxy
- `NEXT_PUBLIC_SUPABASE_URL` — used by API route for document fetch
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — used by API route for document fetch

## Error Handling

- **Token request fails**: Client shows error message, WebSocket never opens
- **Token expires mid-session**: Gemini closes the WebSocket, client detects close and shows reconnect prompt
- **Document not found**: API route returns 404, client shows error
- **Invalid request**: API route returns 400 for missing `documentId`

## Deployment

Single Vercel deployment. No Railway service needed. The only server-side component is the `/api/token` route, which is a standard serverless function.

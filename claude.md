# LegalEase

An AI-powered legal document assistant that makes complex legal paperwork understandable through conversational AI and real-time research.

## Stack

- **Framework:** Next.js 15 (App Router), React 19, TypeScript 5
- **Database & Auth:** Supabase (`@supabase/ssr` + `@supabase/supabase-js`)
- **AI:** Google Gemini (`@google/generative-ai` for text, `@google/genai` for ephemeral tokens)
- **Voice:** Gemini Live API via WebSocket (`gemini-3.1-flash-live-preview`)
- **OCR:** `tesseract.js` (images), `pdf-parse` (PDFs)
- **Testing:** Vitest 4
- **Styling:** Inline React styles + global CSS (`app/globals.css`). No Tailwind, no CSS modules.

## Commands

- `npm run dev` — dev server
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint
- `npx vitest run` — run tests

## Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key (public)
- `GEMINI_API_KEY` — Google Gemini API key (server-only)

---

## Architecture

### Directory Structure

```
app/
  page.tsx                    # Landing page (redirects authed users to /workspace)
  layout.tsx                  # Root layout, fonts, TransitionReveal wrapper
  globals.css                 # All global styles, animations, component classes
  (app)/                      # Protected route group
    layout.tsx                # Two-column layout: Sidebar + content area
    workspace/page.tsx        # Document list & upload
    document/[id]/page.tsx    # Document detail (FAQ / Ask AI / Full Text tabs)
    settings/page.tsx         # User preferences (language, region, reading level)
  api/
    upload/route.ts           # POST: file upload -> text extraction -> FAQ gen -> DB insert
    chat/route.ts             # POST: text Q&A with conversation history
    research/route.ts         # POST: deep research on legal topics
    token/route.ts            # POST: ephemeral Gemini token for voice sessions
    documents/
      route.ts                # GET: list user documents
      [id]/route.ts           # DELETE/PATCH: delete or rename document

components/
  AuthModal.tsx               # Sign up/login, 2-step signup with preferences
  Sidebar.tsx                 # Left nav: doc list, search, upload, settings
  DocumentDetailView.tsx      # Main doc view with 3 tabs, mic button, rename
  DocumentUpload.tsx          # Drag-and-drop file upload (react-dropzone)
  FAQPanel.tsx                # Accordion FAQ: summary, items, dates, obligations
  VoiceChat.tsx               # Voice + text chat with message history
  MicOverlay.tsx              # Bottom mic button with state indicators
  ResearchPanel.tsx           # Auto-inferred research topics + findings
  MarkdownRenderer.tsx        # Custom lightweight markdown parser (no deps)
  MascotAnimation.tsx         # Landing page animated character (sprite frames)
  TransitionReveal.tsx        # Page transition curtain animation
  WorkspaceView.tsx           # Upload-focused workspace view

lib/
  gemini.ts                   # Gemini text API: generateFAQ, answerQuestion, runDeepResearch
  gemini-live.ts              # WebSocket voice client, audio scheduling, state machine
  voice-config.ts             # 45+ language mappings, reading level hints, system prompts
  ocr.ts                      # PDF/image/text extraction utilities
  supabase/
    client.ts                 # Browser-side Supabase client
    server.ts                 # Server-side Supabase client (async, cookies)
    middleware.ts              # Middleware Supabase client for auth checks

types/index.ts                # TypeScript interfaces: Profile, Document, FAQ, ChatMessage, etc.

supabase/schema.sql           # DB schema, RLS policies, storage bucket, auth trigger

__tests__/
  api-token.test.ts           # Token endpoint tests
  middleware.test.ts          # Route protection tests

middleware.ts                 # Next.js auth guard: redirect logic for protected routes
public/pcm-worklet.js        # AudioWorklet for real-time mic input (downsample + PCM)
public/animation/             # Mascot sprite frames (56 PNGs)
```

### Database Schema (Supabase)

| Table | Key Fields | Purpose |
|-------|-----------|---------|
| `profiles` | id (UUID), name, email, region, reading_level (1-3) | User preferences |
| `documents` | id, user_id, file_name, file_url, raw_text, category | Uploaded docs + extracted text |
| `faqs` | id, document_id, summary, items (JSONB), key_dates (JSONB), obligations (JSONB) | Generated FAQ data |
| `research_results` | id, document_id, query, findings, sources (JSONB) | Research findings |
| `chat_messages` | id, document_id, role (user\|model), content | Conversation history |

- RLS: `profiles` scoped to own user. Other tables have permissive policies (hackathon; needs tightening).
- Auth trigger: `handle_new_user()` auto-creates profile on signup.
- Storage: `documents` bucket (public).

### Routing & Auth

- `middleware.ts` checks Supabase auth on every request
- Authenticated `/` -> redirect to `/workspace`
- Unauthenticated `/workspace`, `/document/*`, `/preferences` -> redirect to `/`
- Protected routes live inside `app/(app)/` layout group

### AI Models

- **Text (FAQ, Q&A, Research):** `gemini-2.5-flash` via `lib/gemini.ts`
- **Voice:** `gemini-3.1-flash-live-preview` via WebSocket in `lib/gemini-live.ts`
- **Ephemeral tokens:** Generated server-side at `/api/token` using `@google/genai`

### Key Flows

**Upload:** File -> `/api/upload` -> text extraction (pdf-parse/tesseract/native) -> Gemini FAQ generation -> store document + FAQ in Supabase -> redirect to `/document/[id]`

**Voice:** `/api/token` gets ephemeral token -> `gemini-live.ts` opens WebSocket -> AudioWorklet captures mic at 48kHz -> downsample to 16kHz Int16 PCM -> stream to Gemini -> receive 24kHz audio -> playback with gap-free scheduling

**Document view tabs:** Overview (FAQPanel) | Ask AI (VoiceChat + ResearchPanel) | Full Text

---

## Design Guidelines

- **Fonts:** DM Serif Display (headings), Inter (UI), Merriweather (document content)
- **Colors:** Primary blue `#2563eb`, dark `#1a1a2e`, light `#f9fafb`, borders `#e5e7eb`, text gray `#6b7280`
- **Principles:** Ease first, language accessibility (45+ languages, 3 reading levels), real-time responsiveness, optimized TTS rate
- **No state management library** — local component state + props, Supabase clients passed explicitly
- **Custom events** for cross-component sync (page transitions, document rename)

## Supported Document Types

Rental/housing, employment, immigration, financial, government benefits, general legal (court summons, consent forms, settlements).

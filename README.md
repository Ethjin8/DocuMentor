# LegalEase

An AI-powered legal document assistant that makes complex legal paperwork understandable through plain-language explanations and conversational voice AI.

Upload a document. Get an instant FAQ. Talk to it.

---

## Features

- **Instant FAQ Generation** — Upload a PDF or text file and get a plain-language summary, key dates, obligations, and Q&A within seconds
- **Voice Conversations** — Talk to your document using Gemini 3.1 Flash Live with real-time bidirectional audio streaming
- **Text Chat** — Ask follow-up questions via text with full conversation history
- **40+ Languages** — Full multilingual support for UI, voice, and AI responses
- **Reading Level Adaptation** — Responses adjust from simple (no jargon) to detailed (legal context included)

### Supported Document Types

| Category | Examples |
|----------|---------|
| Rental / Housing | Lease agreements, eviction notices, housing voucher terms |
| Employment | Job contracts, NDAs, non-compete clauses |
| Immigration | Visa applications, asylum paperwork, USCIS notices |
| Financial | Loan agreements, debt collection notices, credit disclosures |
| Government Benefits | Eligibility forms, appeal letters |
| General Legal | Court summons, consent forms, settlement agreements |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router), React 19, TypeScript 5 |
| Database & Auth | Supabase (PostgreSQL + Auth + Storage) |
| AI (Text) | Gemini 2.5 Flash via `@google/generative-ai` |
| AI (Voice) | Gemini 3.1 Flash Live via direct WebSocket + ephemeral tokens |
| Text Extraction | pdf-parse |
| Testing | Vitest 4 |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/app/apikey) API key

### Setup

```bash
git clone https://github.com/Ethjin8/LegalEase.git
cd LegalEase
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

Run the database schema in your Supabase SQL Editor:

```sql
-- Copy and run the contents of supabase/schema.sql
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture

```
Client (Browser)
├── Landing Page         ← Animated intro, auth modal, language/region/reading level setup
├── Workspace            ← Sidebar with document list, search, upload
└── Document View        ← Three tabs: Overview (FAQ), Ask AI (voice/text), Full Text
      │
      ├── FAQ Panel      ← Summary, key dates, obligations, expandable Q&A
      ├── Voice Chat     ← Direct WebSocket to Gemini Live via ephemeral token
      └── Text Chat      ← REST API with conversation history

API Routes
├── /api/upload          ← File upload → text extraction → FAQ generation → Supabase insert
├── /api/chat            ← Text Q&A with language/reading level/region context
├── /api/token           ← Ephemeral Gemini token for voice sessions
└── /api/documents       ← List, rename, delete documents

Voice Pipeline
Browser → /api/token (ephemeral token) → Direct WebSocket → Gemini Live API
           AudioWorklet (48kHz mic) → downsample to 16kHz PCM → stream to Gemini
           Gemini response (24kHz audio) → gap-free playback scheduling
```

### Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User preferences (language, region, reading level) |
| `documents` | File metadata, raw extracted text |
| `faqs` | Generated summaries, Q&A items, key dates, obligations |
| `chat_messages` | Conversation history per document |

---

## Project Structure

```
app/
  page.tsx                    Landing page
  layout.tsx                  Root layout
  (app)/                      Protected route group
    workspace/page.tsx        Document list & upload
    document/[id]/page.tsx    Document detail view
    settings/page.tsx         User preferences
  api/
    upload/route.ts           Text extraction → FAQ generation → DB insert
    chat/route.ts             Text Q&A endpoint
    token/route.ts            Ephemeral Gemini token for voice
    documents/route.ts        List documents
    documents/[id]/route.ts   Delete/rename document
components/
  AuthModal.tsx               Login/signup with language, region, reading level
  Sidebar.tsx                 Document list, search, upload, settings
  DocumentDetailView.tsx      Main document view (FAQ / Ask AI / Full Text tabs)
  DocumentUpload.tsx          Drag-and-drop file upload
  FAQPanel.tsx                FAQ accordion with summary, dates, obligations
  VoiceChat.tsx               Voice + text chat interface
  MicOverlay.tsx              Mic button with state animations
  MarkdownRenderer.tsx        Lightweight markdown renderer
  MascotAnimation.tsx         Landing page character animation
  TransitionReveal.tsx        Page transition animation
  WorkspaceView.tsx           Upload-focused workspace view
lib/
  gemini.ts                   AI functions (generateFAQ, answerQuestion)
  gemini-live.ts              Direct WebSocket client for Gemini Live (voice)
  voice-config.ts             42 language mappings, reading level prompts
  ocr.ts                      Text extraction utilities
  supabase/                   Browser + server Supabase clients
supabase/
  schema.sql                  Database tables, RLS policies, storage bucket
public/
  pcm-worklet.js              AudioWorklet for real-time mic processing
  animation/                  Mascot sprite frames
```

---

## Environment Variables

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `GEMINI_API_KEY` | [Google AI Studio](https://aistudio.google.com/app/apikey) |

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx vitest run` | Run tests |

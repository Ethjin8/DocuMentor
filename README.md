# LegalEase

AI-powered legal document assistant. Upload a document → instant plain-language FAQ → conversational Q&A → background legal research.

---

## Quick Start

```bash
cp .env.local.example .env.local
# Fill in your keys, then:
npm install
npm run dev
```

Then run [supabase/schema.sql](supabase/schema.sql) in your Supabase SQL editor.

---

## Architecture

```
app/
  page.tsx                  ← Upload screen
  document/[id]/page.tsx    ← Document view (FAQ + chat + research)
  api/
    upload/route.ts         ← OCR → Gemini FAQ → Supabase insert
    chat/route.ts           ← Q&A against document text
    research/route.ts       ← Background legal research
components/
  DocumentUpload.tsx        ← Drag & drop
  FAQPanel.tsx              ← Accordion FAQ + key dates + obligations
  VoiceChat.tsx             ← Text chat (Phase 1), voice (Phase 2)
  ResearchPanel.tsx         ← Auto-inferred background research
lib/
  gemini.ts                 ← generateFAQ, answerQuestion, runDeepResearch
  ocr.ts                    ← PDF + image text extraction
  supabase/{client,server}  ← Browser + server Supabase clients
types/index.ts              ← Shared TypeScript types
supabase/schema.sql         ← DB + storage setup
```

---

## Team Game Plan

### Priority 1 — Get it Working (Core flow)

| Task | Notes |
|------|-------|
| Set up Supabase project + run schema.sql | 10 min, anyone |
| Add `.env.local` with real keys | Gemini key from Google AI Studio |
| `npm install && npm run dev` — verify upload → FAQ works | |
| Test with a real PDF (lease, I-9, benefit letter) | |

### Priority 2 — Voice (The Wow Factor)

| Task | Notes |
|------|-------|
| Implement Gemini Live voice in `VoiceChat.tsx` | See `TODO Phase 2` comments in that file |
| Add microphone button → stream audio → play TTS response | Use `@google/generative-ai` multimodal live WebSocket |
| Set TTS speaking rate to ~0.85x for clarity | Pass `speechConfig` in session params |

Gemini Live docs: https://ai.google.dev/gemini-api/docs/multimodal-live

### Priority 3 — Polish

| Task | Notes |
|------|-------|
| Image OCR (Tesseract.js) | `lib/ocr.ts` has the stub — wire to upload route |
| Mobile-responsive layout | Grid collapses to single column on small screens |
| Loading skeleton while FAQ generates | Replace plain "Analyzing..." text |
| Language selector (Spanish, etc.) | Pass `lang` param to Gemini prompts |

### Priority 4 — Demo

- Use a real immigrant-relevant document (I-9, lease, benefit letter)
- Prepare 3 talking points: problem, solution, impact

---

## Key Files

| File | What it does |
|------|-------------|
| [lib/gemini.ts](lib/gemini.ts) | All AI logic — edit prompts here |
| [app/api/upload/route.ts](app/api/upload/route.ts) | Main pipeline: OCR → FAQ → DB |
| [components/VoiceChat.tsx](components/VoiceChat.tsx) | Chat UI — upgrade to voice here |
| [components/FAQPanel.tsx](components/FAQPanel.tsx) | The first thing users see |
| [supabase/schema.sql](supabase/schema.sql) | Run once to set up DB |

---

## Environment Variables

| Variable | Where to get it |
|----------|----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same place |
| `GEMINI_API_KEY` | https://aistudio.google.com/app/apikey |

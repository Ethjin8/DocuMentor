# Ephemeral Token Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Railway WebSocket proxy with Gemini ephemeral tokens so the browser connects directly to the Gemini Live API, enabling Vercel-only deployment.

**Architecture:** A new Next.js API route (`/api/token`) creates short-lived ephemeral tokens and returns them with a pre-built system prompt. The client uses the token to open a direct WebSocket to Gemini. The Railway proxy server is deleted entirely.

**Tech Stack:** Next.js API routes, Gemini Live API ephemeral tokens, Supabase JS client, Vitest

**Spec:** `docs/superpowers/specs/2026-03-29-ephemeral-tokens-design.md`

---

### Task 1: Extract voice config into shared module

**Files:**
- Create: `lib/voice-config.ts`
- Reference: `server/gemini-live-proxy.ts` (lines 23-105, source of truth for current logic)

- [ ] **Step 1: Create `lib/voice-config.ts` with extracted logic**

Move the language codes map, language code lookup, reading level instruction, and system prompt builder from the proxy into this shared module. These are pure functions with no dependencies.

```typescript
// lib/voice-config.ts

/** Map display language names (from Settings) to BCP-47 codes for Gemini TTS */
export const LANGUAGE_CODES: Record<string, string> = {
  "English": "en-US",
  "Spanish (US & Mexico)": "es-US",
  "Portuguese (Brazil)": "pt-BR",
  "French (Canada)": "fr-CA",
  "Mandarin Chinese (Simplified)": "zh-CN",
  "Mandarin Chinese (Traditional)": "zh-TW",
  "Cantonese": "yue-HK",
  "Japanese": "ja-JP",
  "Korean": "ko-KR",
  "Vietnamese": "vi-VN",
  "Thai": "th-TH",
  "Filipino (Tagalog)": "fil-PH",
  "Indonesian": "id-ID",
  "Hindi": "hi-IN",
  "Bengali": "bn-IN",
  "Punjabi": "pa-IN",
  "Marathi": "mr-IN",
  "Telugu": "te-IN",
  "Tamil": "ta-IN",
  "Gujarati": "gu-IN",
  "Urdu": "ur-PK",
  "Kannada": "kn-IN",
  "Malayalam": "ml-IN",
  "French": "fr-FR",
  "German": "de-DE",
  "Italian": "it-IT",
  "Portuguese (Portugal)": "pt-PT",
  "Dutch": "nl-NL",
  "Russian": "ru-RU",
  "Ukrainian": "uk-UA",
  "Polish": "pl-PL",
  "Greek": "el-GR",
  "Swedish": "sv-SE",
  "Danish": "da-DK",
  "Norwegian": "nb-NO",
  "Finnish": "fi-FI",
  "Turkish": "tr-TR",
  "Arabic": "ar-SA",
  "Hebrew": "he-IL",
  "Swahili": "sw-KE",
  "Zulu": "zu-ZA",
  "Amharic": "am-ET",
};

export function getLanguageCode(language?: string): string {
  if (!language) return "en-US";
  return LANGUAGE_CODES[language] ?? "en-US";
}

export function getReadingLevelInstruction(level?: number): string {
  switch (level) {
    case 1: return "READING LEVEL: Simple. Use short sentences and basic vocabulary. Explain as if speaking to someone with no legal background. Avoid all jargon.";
    case 3: return "READING LEVEL: Detailed. Provide thorough explanations with relevant legal context and nuance. You may use legal terms but always define them clearly.";
    default: return "READING LEVEL: Standard. Use plain language and avoid jargon. Be clear and concise.";
  }
}

export function buildSystemPrompt(language?: string, readingLevel?: number): string {
  const lang = language && language !== "English" ? language : null;
  const levelInstruction = getReadingLevelInstruction(readingLevel);

  if (lang) {
    return `You are a friendly, patient legal document assistant for LegalEase.
The user has uploaded a legal document and wants to understand it.

CRITICAL LANGUAGE RULE: You MUST speak and respond ONLY in ${lang}. Every word you say must be in ${lang}. Do NOT use English at all — not even for greetings, transitions, or filler words. If the user speaks in any language, always reply in ${lang}.

${levelInstruction}

Speak clearly at an even pace, pausing between sentences.
Use plain, simple ${lang} — avoid legal jargon.`;
  }

  return `You are a friendly, patient legal document assistant for LegalEase.
The user has uploaded a legal document and wants to understand it.

${levelInstruction}

Speak clearly at an even pace, pausing between sentences.
If the user is a non-native English speaker, be extra clear.`;
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/voice-config.ts
git commit -m "refactor: extract voice config into shared module"
```

---

### Task 2: Write and test the token API route

**Files:**
- Create: `app/api/token/route.ts`
- Create: `__tests__/api-token.test.ts`
- Reference: `lib/voice-config.ts` (from Task 1)
- Reference: `app/api/chat/route.ts` (pattern for Supabase + validation)

- [ ] **Step 1: Write the failing test**

Create `__tests__/api-token.test.ts`. This tests the API route handler directly. We mock `fetch` (for the Gemini token endpoint) and Supabase (for document lookup).

```typescript
// __tests__/api-token.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase client
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockSingle = vi.fn();
const mockFrom = vi.fn(() => ({ select: mockSelect }));
mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ single: mockSingle });

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// Mock global fetch for Gemini token endpoint
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Set env vars
vi.stubEnv("GEMINI_API_KEY", "test-api-key");

import { POST } from "@/app/api/token/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("http://localhost:3000/api/token", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/token", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when documentId is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/documentId/i);
  });

  it("returns 404 when document is not found", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "not found" } });

    const res = await POST(makeRequest({ documentId: "missing-id" }));
    expect(res.status).toBe(404);
  });

  it("returns token and config on success", async () => {
    mockSingle.mockResolvedValue({
      data: { raw_text: "This is a lease agreement..." },
      error: null,
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ name: "ephemeral-token-abc" }),
    });

    const res = await POST(makeRequest({
      documentId: "doc-123",
      language: "Spanish (US & Mexico)",
      readingLevel: 1,
    }));

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.token).toBe("ephemeral-token-abc");
    expect(json.systemPrompt).toContain("legal document assistant");
    expect(json.systemPrompt).toContain("This is a lease agreement");
    expect(json.systemPrompt).toContain("Spanish (US & Mexico)");
    expect(json.languageCode).toBe("es-US");
    expect(json.voiceName).toBe("Puck");

    // Verify fetch was called with correct Gemini endpoint
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("generativelanguage.googleapis.com"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns 500 when token creation fails", async () => {
    mockSingle.mockResolvedValue({
      data: { raw_text: "Some doc text" },
      error: null,
    });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 403,
      text: () => Promise.resolve("Forbidden"),
    });

    const res = await POST(makeRequest({ documentId: "doc-123" }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/token/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/api-token.test.ts`
Expected: FAIL — module `@/app/api/token/route` does not exist yet.

- [ ] **Step 3: Implement the API route**

Create `app/api/token/route.ts`:

```typescript
// app/api/token/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt, getLanguageCode } from "@/lib/voice-config";

export async function POST(req: NextRequest) {
  const { documentId, language, readingLevel } = await req.json();

  if (!documentId || typeof documentId !== "string") {
    return NextResponse.json(
      { error: "documentId is required" },
      { status: 400 },
    );
  }

  // Fetch document text from Supabase
  const supabase = await createClient();
  const { data: doc, error } = await supabase
    .from("documents")
    .select("raw_text")
    .eq("id", documentId)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Create ephemeral token via Gemini API
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 },
    );
  }

  const tokenRes = await fetch(
    `https://generativelanguage.googleapis.com/v1alpha/auth_tokens?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        uses: 1,
        expire_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    },
  );

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    console.error("Ephemeral token creation failed:", tokenRes.status, detail);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 },
    );
  }

  const tokenData = await tokenRes.json();
  const docText = doc.raw_text?.slice(0, 8000) ?? "";
  const systemPrompt = `${buildSystemPrompt(language, readingLevel)}\n\nDocument content:\n${docText}`;

  return NextResponse.json({
    token: tokenData.name,
    systemPrompt,
    languageCode: getLanguageCode(language),
    voiceName: "Puck",
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/api-token.test.ts`
Expected: All 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/token/route.ts __tests__/api-token.test.ts
git commit -m "feat: add ephemeral token API route with tests"
```

---

### Task 3: Update the client to use ephemeral tokens

**Files:**
- Modify: `lib/gemini-live.ts`

- [ ] **Step 1: Rewrite `connect()` to fetch token and connect directly**

Replace the proxy WebSocket connection with a two-step flow: fetch ephemeral token from `/api/token`, then connect directly to Gemini.

Replace the full contents of `lib/gemini-live.ts` with:

```typescript
// lib/gemini-live.ts
export type VoiceState = "idle" | "connecting" | "listening" | "thinking" | "speaking";

type EventMap = {
  stateChange: VoiceState;
  transcript: { role: "user" | "model"; text: string };
  error: string;
};

type Listener<K extends keyof EventMap> = (data: EventMap[K]) => void;

export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private state: VoiceState = "idle";
  private listeners: { [K in keyof EventMap]?: Listener<K>[] } = {};

  // Audio playback — schedule contiguously to avoid gaps
  private playbackQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private nextPlayTime = 0;
  private currentSource: AudioBufferSourceNode | null = null;
  private turnComplete = false;
  private micAnalyser: AnalyserNode | null = null;
  private playbackAnalyser: AnalyserNode | null = null;

  on<K extends keyof EventMap>(event: K, fn: Listener<K>) {
    if (!this.listeners[event]) this.listeners[event] = [];
    (this.listeners[event] as Listener<K>[]).push(fn);
  }

  off<K extends keyof EventMap>(event: K, fn: Listener<K>) {
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    if (arr) this.listeners[event] = arr.filter((f) => f !== fn) as any;
  }

  private emit<K extends keyof EventMap>(event: K, data: EventMap[K]) {
    const arr = this.listeners[event] as Listener<K>[] | undefined;
    arr?.forEach((fn) => fn(data));
  }

  private setState(s: VoiceState) {
    this.state = s;
    this.emit("stateChange", s);
  }

  getState() {
    return this.state;
  }

  getMicAnalyser(): AnalyserNode | null {
    return this.micAnalyser;
  }

  getPlaybackAnalyser(): AnalyserNode | null {
    return this.playbackAnalyser;
  }

  async connect(documentId: string, language?: string, readingLevel?: number) {
    if (this.state !== "idle") return;
    this.setState("connecting");

    try {
      // 1. Fetch ephemeral token and config from our API
      const tokenRes = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId, language, readingLevel }),
      });

      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({ error: "Failed to get token" }));
        throw new Error(err.error || "Failed to get token");
      }

      const { token, systemPrompt, languageCode, voiceName } = await tokenRes.json();

      // 2. Set up audio context and worklet
      this.audioContext = new AudioContext({ sampleRate: 48000 });
      await this.audioContext.audioWorklet.addModule("/pcm-worklet.js");

      // 3. Get mic access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 },
      });
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);

      this.micAnalyser = this.audioContext.createAnalyser();
      this.micAnalyser.fftSize = 256;
      source.connect(this.micAnalyser);

      this.playbackAnalyser = this.audioContext.createAnalyser();
      this.playbackAnalyser.fftSize = 256;

      this.workletNode = new AudioWorkletNode(this.audioContext, "pcm-processor");

      // When worklet sends a PCM chunk, forward it directly to Gemini
      this.workletNode.port.onmessage = (e: MessageEvent) => {
        if (this.ws?.readyState === WebSocket.OPEN && this.state === "listening") {
          const pcmBuffer: ArrayBuffer = e.data.pcm;
          const base64 = arrayBufferToBase64(pcmBuffer);
          this.ws.send(
            JSON.stringify({
              realtimeInput: {
                audio: {
                  data: base64,
                  mimeType: "audio/pcm;rate=16000",
                },
              },
            })
          );
        }
      };

      source.connect(this.workletNode);
      // Connect worklet to destination via silent gain node to keep it alive without audio feedback
      const silencer = this.audioContext.createGain();
      silencer.gain.value = 0;
      this.workletNode.connect(silencer);
      silencer.connect(this.audioContext.destination);

      // 4. Open WebSocket directly to Gemini using ephemeral token
      const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?access_token=${token}`;
      this.ws = new WebSocket(geminiUrl);

      this.ws.onopen = () => {
        // Send setup message with model config and system prompt
        const setupMessage = {
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: voiceName,
                  },
                },
                languageCode: languageCode,
              },
            },
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
          },
        };
        this.ws!.send(JSON.stringify(setupMessage));
      };

      this.ws.onmessage = (e: MessageEvent) => {
        try {
          const msg = JSON.parse(e.data);
          this.handleServerMessage(msg);
        } catch {
          this.emit("error", "Received invalid message from server");
        }
      };

      this.ws.onerror = () => {
        this.emit("error", "WebSocket connection failed");
        this.disconnect();
      };

      this.ws.onclose = () => {
        if (this.state !== "idle") {
          this.disconnect();
        }
      };
    } catch (err: any) {
      const message =
        err?.name === "NotAllowedError"
          ? "Microphone access denied. Please allow mic access and try again."
          : err?.message ?? "Failed to connect";
      this.emit("error", message);
      this.disconnect();
    }
  }

  private handleServerMessage(msg: any) {
    // Gemini setup acknowledgment — now ready to stream
    if (msg.setupComplete !== undefined) {
      this.setState("listening");
      return;
    }

    // Error from Gemini
    if (msg.error) {
      this.emit("error", msg.error.message || "Gemini error");
      this.disconnect();
      return;
    }

    const sc = msg.serverContent;
    if (!sc) return;

    // Audio data from model
    if (sc.modelTurn?.parts) {
      if (this.state !== "speaking") {
        this.turnComplete = false;
      }
      for (const part of sc.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.setState("speaking");
          this.queueAudio(part.inlineData.data);
        }
      }
    }

    // Transcription of user input
    if (sc.inputTranscription?.text) {
      this.emit("transcript", { role: "user", text: sc.inputTranscription.text });
    }

    // Transcription of model output
    if (sc.outputTranscription?.text) {
      this.emit("transcript", { role: "model", text: sc.outputTranscription.text });
    }

    // Model turn complete
    if (sc.turnComplete) {
      this.turnComplete = true;
      if (!this.isPlaying) {
        this.setState("listening");
      }
    }

    // Model was interrupted
    if (sc.interrupted) {
      this.playbackQueue = [];
      this.nextPlayTime = 0;
      this.turnComplete = false;
      if (this.currentSource) {
        this.currentSource.stop();
        this.currentSource = null;
      }
      this.isPlaying = false;
      this.setState("listening");
    }
  }

  private queueAudio(base64Pcm: string) {
    if (!this.audioContext) return;

    const raw = base64ToArrayBuffer(base64Pcm);
    const int16 = new Int16Array(raw);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
    }

    const buffer = this.audioContext.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    this.scheduleBuffer(buffer);
  }

  private scheduleBuffer(buffer: AudioBuffer) {
    if (!this.audioContext) return;

    const now = this.audioContext.currentTime;

    // If nothing is scheduled or we've fallen behind, start from now with a small buffer
    if (this.nextPlayTime <= now) {
      this.nextPlayTime = now + 0.02; // 20ms buffer to avoid underrun
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(this.playbackAnalyser!);
    this.playbackAnalyser!.connect(this.audioContext.destination);

    const endTime = this.nextPlayTime + buffer.duration;

    source.onended = () => {
      // Only the last buffer in the chain should trigger the transition
      if (this.currentSource !== source) return;
      this.currentSource = null;
      this.isPlaying = false;

      // If model turn is already complete, go back to listening
      if (this.turnComplete) {
        this.turnComplete = false;
        if (this.state === "speaking") {
          this.setState("listening");
        }
      }
    };

    source.start(this.nextPlayTime);
    this.nextPlayTime = endTime;
    this.currentSource = source;
    this.isPlaying = true;
  }

  disconnect() {
    // Stop mic
    this.mediaStream?.getTracks().forEach((t) => t.stop());
    this.mediaStream = null;

    // Disconnect worklet
    this.workletNode?.disconnect();
    this.workletNode = null;
    this.micAnalyser = null;
    this.playbackAnalyser = null;

    // Close audio context
    this.audioContext?.close();
    this.audioContext = null;

    // Stop playback
    this.playbackQueue = [];
    this.nextPlayTime = 0;
    this.turnComplete = false;
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    this.isPlaying = false;

    // Close WebSocket
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      this.ws.close();
    }
    this.ws = null;

    this.setState("idle");
  }

  sendText(text: string) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ realtimeInput: { text } }));
    }
  }
}

// -- Helpers --

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
```

Key changes from the original:
- `connect()` now calls `POST /api/token` before opening the WebSocket
- WebSocket URL uses `access_token=TOKEN` instead of connecting to the proxy
- `onopen` sends the setup message (model, voice config, system prompt) directly
- `handleServerMessage` checks for `setupComplete` from Gemini directly (instead of `{ type: "ready" }` from the proxy)
- Error handling checks for `msg.error` (Gemini's error format) instead of `msg.error` string from proxy
- All audio handling code is unchanged

- [ ] **Step 2: Commit**

```bash
git add lib/gemini-live.ts
git commit -m "feat: connect directly to Gemini using ephemeral tokens"
```

---

### Task 4: Remove the Railway proxy and clean up dependencies

**Files:**
- Delete: `server/gemini-live-proxy.ts`
- Delete: `railway.json`
- Modify: `package.json`

- [ ] **Step 1: Delete proxy server and Railway config**

```bash
rm server/gemini-live-proxy.ts
rm railway.json
```

If the `server/` directory is now empty, delete it too:
```bash
rmdir server/ 2>/dev/null || true
```

- [ ] **Step 2: Remove proxy scripts and unused dependencies from `package.json`**

In `package.json`, remove these scripts:
- `"dev:proxy": "DOTENV_CONFIG_PATH=.env.local tsx server/gemini-live-proxy.ts"`
- `"start:proxy": "tsx server/gemini-live-proxy.ts"`

Remove these dependencies:
- `"ws"` from `dependencies`
- `"dotenv"` from `dependencies`
- `"tsx"` from `dependencies`
- `"@types/ws"` from `devDependencies`

The resulting scripts section should be:
```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
},
```

- [ ] **Step 3: Run `npm install` to update lockfile**

Run: `npm install`
Expected: Lockfile updated, no errors.

- [ ] **Step 4: Verify the build still works**

Run: `npm run build`
Expected: Build succeeds with no errors referencing the deleted proxy, `ws`, or `NEXT_PUBLIC_PROXY_URL`.

- [ ] **Step 5: Run all tests**

Run: `npx vitest run`
Expected: All tests pass (middleware tests + new token route tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: remove Railway proxy and unused dependencies"
```

---

### Task 5: Update environment configuration

**Files:**
- Modify: `.env.local` (or `.env.example` if it exists)

- [ ] **Step 1: Remove obsolete env vars**

Remove these environment variables from `.env.local` and any `.env.example`:
- `NEXT_PUBLIC_PROXY_URL`
- `PROXY_PORT`

The remaining env vars should be:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `GEMINI_API_KEY`

- [ ] **Step 2: Commit**

```bash
git add .env.example 2>/dev/null; git add .env.local.example 2>/dev/null
git commit -m "chore: remove proxy env vars from example config" --allow-empty
```

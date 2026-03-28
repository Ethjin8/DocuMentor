"use client";

// ── VoiceChat ────────────────────────────────────────────────────────────────
// Phase 1: Text-based Q&A (works now)
// Phase 2: Swap in Gemini Live WebSocket for real-time voice (TODO)
//
// To upgrade to voice: replace the sendMessage function with a
// Gemini Live session using the multimodal live API.
// Docs: https://ai.google.dev/gemini-api/docs/multimodal-live

import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "@/types";

interface Props {
  documentId: string;
}

export default function VoiceChat({ documentId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    setLoading(true);

    const userMsg: ChatMessage = { role: "user", text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          question: text,
          history: messages,
        }),
      });

      const json = await res.json();
      const answer = json.answer ?? "Sorry, I couldn't get an answer. Try again.";

      setMessages((prev) => [
        ...prev,
        { role: "model", text: answer, timestamp: new Date() },
      ]);

      // TODO Phase 2: speak answer using Gemini Live TTS
      // speakText(answer);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "model",
          text: "Connection error. Please try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        height: 560,
        background: "#fff",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderBottom: "1px solid #e5e7eb",
          fontWeight: 600,
        }}
      >
        Ask a Question
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#9ca3af", fontSize: "0.9rem", textAlign: "center", marginTop: "2rem" }}>
            Ask anything about this document — in any language.
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              background: msg.role === "user" ? "#2563eb" : "#f3f4f6",
              color: msg.role === "user" ? "#fff" : "#1f2937",
              borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
              padding: "0.6rem 0.9rem",
              fontSize: "0.9rem",
              lineHeight: 1.6,
            }}
          >
            {msg.text}
          </div>
        ))}
        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              background: "#f3f4f6",
              borderRadius: "12px 12px 12px 2px",
              padding: "0.6rem 1rem",
              color: "#6b7280",
              fontSize: "0.85rem",
            }}
          >
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: "0.75rem",
          borderTop: "1px solid #e5e7eb",
          display: "flex",
          gap: "0.5rem",
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
          placeholder="Type your question..."
          disabled={loading}
          style={{
            flex: 1,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            padding: "0.5rem 0.75rem",
            fontSize: "0.9rem",
            outline: "none",
          }}
        />
        {/* TODO Phase 2: Voice button */}
        {/* <VoiceButton onTranscript={sendMessage} /> */}
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            background: "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "0.5rem 1rem",
            cursor: "pointer",
            fontWeight: 500,
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

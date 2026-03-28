"use client";

import { useState } from "react";
import type { FAQ } from "@/types";

interface Props {
  faq: FAQ | null;
}

export default function FAQPanel({ faq }: Props) {
  const [open, setOpen] = useState<number | null>(0);

  if (!faq) {
    return (
      <div style={{ padding: "1.5rem", background: "#f9fafb", borderRadius: 10 }}>
        <p style={{ color: "#6b7280" }}>No FAQ available for this document.</p>
      </div>
    );
  }

  return (
    <section style={{ marginBottom: "2rem" }}>
      {/* Summary */}
      <div
        style={{
          background: "#eff6ff",
          borderRadius: 10,
          padding: "1.25rem 1.5rem",
          marginBottom: "1.5rem",
          borderLeft: "4px solid #2563eb",
        }}
      >
        <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Summary</p>
        <p style={{ color: "#374151", lineHeight: 1.7 }}>{faq.summary}</p>
      </div>

      {/* Key dates & obligations */}
      {faq.key_dates.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>Key Dates</p>
          <ul style={{ paddingLeft: "1.25rem", color: "#374151" }}>
            {faq.key_dates.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </div>
      )}

      {faq.obligations.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <p style={{ fontWeight: 600, marginBottom: "0.4rem" }}>
            Your Obligations
          </p>
          <ul style={{ paddingLeft: "1.25rem", color: "#374151" }}>
            {faq.obligations.map((o, i) => (
              <li key={i}>{o}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Accordion FAQ items */}
      <p style={{ fontWeight: 600, marginBottom: "0.75rem" }}>
        Frequently Asked Questions
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {faq.items.map((item, i) => (
          <div
            key={i}
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "0.9rem 1.1rem",
                background: open === i ? "#f0f9ff" : "#fff",
                border: "none",
                cursor: "pointer",
                fontWeight: 500,
                fontSize: "0.95rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              {item.question}
              <span style={{ color: "#6b7280", fontSize: "1.1rem" }}>
                {open === i ? "−" : "+"}
              </span>
            </button>
            {open === i && (
              <div
                style={{
                  padding: "0.75rem 1.1rem 1rem",
                  color: "#374151",
                  lineHeight: 1.7,
                  borderTop: "1px solid #e5e7eb",
                }}
              >
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

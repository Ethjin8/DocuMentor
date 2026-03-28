"use client";

import { useEffect, useState } from "react";
import type { ResearchResult } from "@/types";

interface Props {
  documentId: string;
  documentText: string;
}

// Pulls 2-3 research topics from the document text automatically
function inferTopics(text: string): string[] {
  const lower = text.toLowerCase();
  const topics: string[] = [];

  if (lower.includes("evict") || lower.includes("lease") || lower.includes("rent"))
    topics.push("tenant rights and eviction protections");
  if (lower.includes("visa") || lower.includes("uscis") || lower.includes("asylum"))
    topics.push("immigration legal aid resources");
  if (lower.includes("employment") || lower.includes("non-compete") || lower.includes("nda"))
    topics.push("employee rights and non-compete enforceability");
  if (lower.includes("loan") || lower.includes("debt") || lower.includes("credit"))
    topics.push("consumer debt rights and protections");
  if (lower.includes("court") || lower.includes("summons") || lower.includes("lawsuit"))
    topics.push("responding to a court summons");

  // Default fallback
  if (topics.length === 0) topics.push("legal aid organizations near me");

  return topics.slice(0, 2);
}

export default function ResearchPanel({ documentId, documentText }: Props) {
  const [results, setResults] = useState<ResearchResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const topics = inferTopics(documentText);

    Promise.all(
      topics.map((topic) =>
        fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId, topic }),
        }).then((r) => r.json())
      )
    )
      .then((data) => setResults(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [documentId, documentText]);

  return (
    <section>
      <h3 style={{ fontWeight: 600, marginBottom: "1rem", fontSize: "1rem" }}>
        Background Research
      </h3>

      {loading ? (
        <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
          Researching relevant legal context...
        </p>
      ) : results.length === 0 ? (
        <p style={{ color: "#6b7280", fontSize: "0.9rem" }}>
          No research results available.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: "1rem 1.25rem",
              }}
            >
              <p style={{ fontWeight: 600, marginBottom: "0.5rem", fontSize: "0.9rem" }}>
                {r.query}
              </p>
              <p style={{ color: "#374151", fontSize: "0.88rem", lineHeight: 1.65, marginBottom: "0.75rem" }}>
                {r.findings}
              </p>
              {r.sources?.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                  {r.sources.map((s, j) => (
                    <a
                      key={j}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "0.85rem", color: "#2563eb" }}
                    >
                      {s.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

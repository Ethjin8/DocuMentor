import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import FAQPanel from "@/components/FAQPanel";
import VoiceChat from "@/components/VoiceChat";
import ResearchPanel from "@/components/ResearchPanel";
import type { Document, FAQ } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DocumentPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: doc }, { data: faq }] = await Promise.all([
    supabase.from("documents").select("*").eq("id", id).single(),
    supabase.from("faqs").select("*").eq("document_id", id).single(),
  ]);

  if (!doc) notFound();

  return (
    <main
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        padding: "2rem 1.5rem",
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: "2rem",
        alignItems: "start",
      }}
    >
      {/* Left column: FAQ + Research */}
      <div>
        <h2
          style={{
            fontFamily: "Merriweather, serif",
            fontSize: "1.4rem",
            marginBottom: "1.5rem",
          }}
        >
          {(doc as Document).file_name}
        </h2>

        <FAQPanel faq={faq as FAQ} />
        <ResearchPanel documentId={id} documentText={(doc as Document).raw_text} />
      </div>

      {/* Right column: Conversational Q&A */}
      <div style={{ position: "sticky", top: "2rem" }}>
        <VoiceChat documentId={id} />
      </div>
    </main>
  );
}

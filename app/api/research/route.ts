import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runDeepResearch } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { documentId, topic } = await req.json();

  if (!documentId || !topic) {
    return NextResponse.json(
      { error: "documentId and topic required" },
      { status: 400 }
    );
  }

  const { data: doc, error } = await supabase
    .from("documents")
    .select("raw_text")
    .eq("id", documentId)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const result = await runDeepResearch(doc.raw_text, topic);

  // Persist research result
  await supabase.from("research_results").insert({
    document_id: documentId,
    query: topic,
    ...result,
  });

  return NextResponse.json(result);
}

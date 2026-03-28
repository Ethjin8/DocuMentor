import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { answerQuestion } from "@/lib/gemini";
import type { ChatMessage } from "@/types";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { documentId, question, history, language, readingLevel } = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("region").eq("id", user.id).single()
    : { data: null };
  const region = profile?.region || undefined;

  if (!documentId || !question) {
    return NextResponse.json(
      { error: "documentId and question required" },
      { status: 400 }
    );
  }

  // Fetch document text
  const { data: doc, error } = await supabase
    .from("documents")
    .select("raw_text")
    .eq("id", documentId)
    .single();

  if (error || !doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Map chat history to Gemini format
  const geminiHistory = (history as ChatMessage[]).map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.text }],
  }));

  const answer = await answerQuestion(doc.raw_text, question, geminiHistory, language, readingLevel, region);

  // Persist both turns
  const { error: insertError } = await supabase.from("chat_messages").insert([
    { document_id: documentId, role: "user",  content: question },
    { document_id: documentId, role: "model", content: answer },
  ]);
  if (insertError) console.error("chat_messages insert error:", insertError.message);

  return NextResponse.json({ answer });
}

export type ReadingLevel = 1 | 2 | 3; // 1 = Simple, 2 = Intermediate, 3 = Advanced

export interface Profile {
  id: string;
  name: string;
  email: string;
  region: string;
  reading_level: ReadingLevel;
  created_at: string;
  updated_at: string;
}

export type DocumentCategory =
  | "rental"
  | "employment"
  | "immigration"
  | "financial"
  | "benefits"
  | "legal";

export interface Document {
  id: string;
  user_id: string;
  file_name: string;
  file_url: string;
  raw_text: string;
  category: DocumentCategory | null;
  created_at: string;
}

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQ {
  id: string;
  document_id: string;
  items: FAQItem[];
  summary: string;
  key_dates: string[];
  obligations: string[];
  created_at: string;
}

export interface ResearchResult {
  id: string;
  document_id: string;
  query: string;
  findings: string;
  sources: { title: string; url: string }[];
  created_at: string;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

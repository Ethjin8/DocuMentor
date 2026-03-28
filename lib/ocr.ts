// OCR + text extraction utilities
// Supports: PDF (pdf-parse), images (Tesseract.js), plain text

export async function extractTextFromFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    return extractFromPDF(file);
  }

  if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(ext ?? "")) {
    return extractFromImage(file);
  }

  // Plain text fallback
  return file.text();
}

async function extractFromPDF(file: File): Promise<string> {
  // pdf-parse runs server-side — this helper is called from the API route
  // Import dynamically to avoid bundling on the client
  const pdfParse = (await import("pdf-parse")).default;
  const buffer = Buffer.from(await file.arrayBuffer());
  const data = await pdfParse(buffer);
  return data.text;
}

async function extractFromImage(file: File): Promise<string> {
  const Tesseract = await import("tesseract.js");
  const worker = await Tesseract.createWorker("eng");
  const url = URL.createObjectURL(file);
  const { data } = await worker.recognize(url);
  await worker.terminate();
  URL.revokeObjectURL(url);
  return data.text;
}

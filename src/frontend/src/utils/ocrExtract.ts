export async function extractTextFromImageUrl(
  imageUrl: string,
): Promise<string> {
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    const { data } = await worker.recognize(imageUrl);
    return data.text;
  } finally {
    await worker.terminate();
  }
}

export function extractDocumentValue(text: string, docType: string): string {
  switch (docType) {
    case "Aadhaar Card": {
      const m = text.match(/\b\d{4}\s\d{4}\s\d{4}\b|\b\d{12}\b/);
      return m ? m[0] : "Uploaded";
    }
    case "PAN Card": {
      const m = text.match(/\b[A-Z]{5}\d{4}[A-Z]\b/);
      return m ? m[0] : "Uploaded";
    }
    case "Voter ID": {
      const m = text.match(/\b[A-Z]{3}\d{7}\b/);
      return m ? m[0] : "Uploaded";
    }
    case "Driving License": {
      const m = text.match(
        /\b[A-Z]{2}\d{2}\s?\d{11}\b|\b[A-Z]{2}-\d{2}-\d{4}-\d{7}\b/,
      );
      return m ? m[0] : "Uploaded";
    }
    case "Passport": {
      const m = text.match(/\b[A-Z]\d{7}\b/);
      return m ? m[0] : "Uploaded";
    }
    default:
      return "Uploaded";
  }
}

export function extractDOB(text: string): string {
  const m = text.match(/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/);
  return m ? m[0] : "";
}

export async function extractValueFromDocument(
  blobUrl: string,
  docType: string,
): Promise<{ value: string; dob: string }> {
  try {
    const resp = await fetch(blobUrl);
    const buffer = await resp.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 4));
    // PDF magic bytes: %PDF = 0x25 0x50 0x44 0x46
    if (
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46
    ) {
      return { value: "Uploaded", dob: "" };
    }
    const blob = new Blob([buffer]);
    const objectUrl = URL.createObjectURL(blob);
    try {
      const text = await extractTextFromImageUrl(objectUrl);
      const value = extractDocumentValue(text, docType);
      const dob = extractDOB(text);
      return { value, dob };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return { value: "Uploaded", dob: "" };
  }
}

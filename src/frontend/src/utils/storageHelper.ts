import { getSharedStorageClient } from "../config";

const MOTOKO_DEDUPLICATION_SENTINEL = "!caf!";

export function detectMimeType(bytes: Uint8Array): string {
  // PDF: %PDF
  if (
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  ) {
    return "application/pdf";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  // GIF: GIF8
  if (
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38
  ) {
    return "image/gif";
  }
  // WebP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes.length > 11 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  // BMP: BM
  if (bytes[0] === 0x42 && bytes[1] === 0x4d) {
    return "image/bmp";
  }
  return "application/octet-stream";
}

export async function uploadFileAndGetBlobId(
  file: File | Blob,
  onProgress?: (pct: number) => void,
  _suggestedFilename?: string,
): Promise<string> {
  const client = await getSharedStorageClient();
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { hash } = await client.putFile(bytes, onProgress);
  return MOTOKO_DEDUPLICATION_SENTINEL + hash;
}

export async function getBlobUrl(blobId: string): Promise<string> {
  const client = await getSharedStorageClient();
  const hash = blobId.startsWith(MOTOKO_DEDUPLICATION_SENTINEL)
    ? blobId.substring(MOTOKO_DEDUPLICATION_SENTINEL.length)
    : blobId;
  return client.getDirectURL(hash);
}

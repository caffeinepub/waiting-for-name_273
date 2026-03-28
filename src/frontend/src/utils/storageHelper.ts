import { getSharedStorageClient } from "../config";

const MOTOKO_DEDUPLICATION_SENTINEL = "!caf!";

export async function uploadFileAndGetBlobId(
  file: File | Blob,
  onProgress?: (pct: number) => void,
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

import { Button } from "@/components/ui/button";
import { getBlobUrl } from "@/utils/storageHelper";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

// Detect MIME type from magic bytes — reliable regardless of server headers
async function detectMimeFromBytes(
  url: string,
): Promise<{ mime: string; blob: Blob }> {
  const resp = await fetch(url);
  const blob = await resp.blob();
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());

  // PDF: %PDF
  if (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46
  )
    return { mime: "application/pdf", blob };
  // PNG
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  )
    return { mime: "image/png", blob };
  // JPEG
  if (header[0] === 0xff && header[1] === 0xd8)
    return { mime: "image/jpeg", blob };
  // GIF
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46)
    return { mime: "image/gif", blob };
  // WebP: RIFF....WEBP
  if (
    header[0] === 0x52 &&
    header[1] === 0x49 &&
    header[2] === 0x46 &&
    header[3] === 0x46 &&
    header[8] === 0x57 &&
    header[9] === 0x45 &&
    header[10] === 0x42 &&
    header[11] === 0x50
  )
    return { mime: "image/webp", blob };

  // Fall back to whatever the server says
  const serverMime = blob.type.split(";")[0].trim();
  return { mime: serverMime || "application/octet-stream", blob };
}

interface Props {
  blobId: string;
  onClose: () => void;
}

export default function DocumentViewerPage({ blobId, onClose }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [directUrl, setDirectUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("application/octet-stream");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let createdObjectUrl: string | null = null;

    async function load() {
      try {
        const resolved = await getBlobUrl(blobId);
        if (cancelled) return;

        const { mime, blob } = await detectMimeFromBytes(resolved);
        if (cancelled) return;

        // Create a typed object URL for images and downloads
        const typedBlob = new Blob([await blob.arrayBuffer()], { type: mime });
        const objUrl = URL.createObjectURL(typedBlob);
        createdObjectUrl = objUrl;

        setDirectUrl(resolved);
        setObjectUrl(objUrl);
        setMimeType(mime);
      } catch {
        if (!cancelled) setError("Failed to load document.");
      }
    }
    load();
    return () => {
      cancelled = true;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
    };
  }, [blobId]);

  async function handleDownload() {
    if (!objectUrl) return;
    try {
      const ext = mimeType.includes("pdf")
        ? "pdf"
        : mimeType.includes("png")
          ? "png"
          : mimeType.includes("gif")
            ? "gif"
            : mimeType.includes("webp")
              ? "webp"
              : "jpg";
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `document.${ext}`;
      a.click();
    } catch {
      if (directUrl) window.open(directUrl, "_blank");
    }
  }

  const isPdf = mimeType === "application/pdf";
  const isImage = mimeType.startsWith("image/");

  // Google Docs Viewer URL for PDFs — works on all devices including mobile
  const googleViewerUrl = directUrl
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(directUrl)}&embedded=true`
    : null;

  return (
    <div
      className="min-h-screen flex flex-col bg-background"
      data-ocid="document_viewer.panel"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          data-ocid="document_viewer.close_button"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          Document Viewer
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          disabled={!objectUrl}
          data-ocid="document_viewer.download_button"
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {error && (
          <div
            className="text-destructive text-center"
            data-ocid="document_viewer.error_state"
          >
            <p className="text-lg font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}

        {!objectUrl && !error && (
          <div
            className="flex flex-col items-center gap-3"
            data-ocid="document_viewer.loading_state"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading document...</p>
          </div>
        )}

        {objectUrl && isPdf && googleViewerUrl && (
          <div
            className="w-full flex-1 flex flex-col"
            style={{ height: "calc(100vh - 64px)" }}
          >
            <iframe
              src={googleViewerUrl}
              className="w-full flex-1 border-0 rounded"
              style={{ height: "100%", minHeight: "500px" }}
              title="Document Viewer"
              allow="autoplay"
            />
            <p className="text-xs text-center text-muted-foreground mt-2">
              PDF not loading?{" "}
              <a
                href={directUrl ?? ""}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Open directly
              </a>
            </p>
          </div>
        )}

        {objectUrl && isImage && (
          <img
            src={objectUrl}
            alt="Document"
            className="max-w-full max-h-full object-contain rounded shadow-md"
            style={{ maxHeight: "calc(100vh - 100px)" }}
          />
        )}

        {objectUrl && !isPdf && !isImage && (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              This file type cannot be previewed. Use the Download button above.
            </p>
            <Button
              onClick={handleDownload}
              data-ocid="document_viewer.primary_button"
            >
              <Download className="h-4 w-4 mr-2" />
              Download File
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { getBlobUrl } from "@/utils/storageHelper";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface Props {
  blobId: string;
  onClose: () => void;
}

export default function DocumentViewerPage({ blobId, onClose }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("application/octet-stream");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const resolved = await getBlobUrl(blobId);
        if (cancelled) return;
        // Try HEAD to detect content-type
        try {
          const head = await fetch(resolved, { method: "HEAD" });
          const ct = head.headers.get("content-type") || "";
          if (!cancelled)
            setMimeType(ct.split(";")[0].trim() || "application/octet-stream");
        } catch {
          // ignore HEAD failure, will rely on rendering heuristics
        }
        if (!cancelled) setUrl(resolved);
      } catch {
        if (!cancelled) setError("Failed to load document.");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [blobId]);

  async function handleDownload() {
    if (!url) return;
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const ct = blob.type || mimeType;
      const ext = ct.includes("pdf")
        ? "pdf"
        : ct.includes("png")
          ? "png"
          : ct.includes("gif")
            ? "gif"
            : ct.includes("webp")
              ? "webp"
              : "jpg";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `document.${ext}`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(url, "_blank");
    }
  }

  const isPdf = mimeType.includes("pdf");
  const isImage = mimeType.startsWith("image/");

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
          disabled={!url}
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

        {!url && !error && (
          <div
            className="flex flex-col items-center gap-3"
            data-ocid="document_viewer.loading_state"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading document...</p>
          </div>
        )}

        {url && isPdf && (
          <div
            className="w-full flex-1 flex flex-col"
            style={{ height: "calc(100vh - 64px)" }}
          >
            <iframe
              src={url}
              className="w-full flex-1 border-0 rounded"
              style={{ height: "100%", minHeight: "500px" }}
              title="Document Viewer"
            />
            <p className="text-xs text-center text-muted-foreground mt-2">
              PDF not loading?{" "}
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-primary"
              >
                Open in browser
              </a>
            </p>
          </div>
        )}

        {url && isImage && (
          <img
            src={url}
            alt="Document"
            className="max-w-full max-h-full object-contain rounded shadow-md"
            style={{ maxHeight: "calc(100vh - 100px)" }}
          />
        )}

        {url && !isPdf && !isImage && (
          <div className="text-center">
            <p className="text-muted-foreground mb-4">
              Preview not available for this file type.
            </p>
            <Button
              onClick={() => window.open(url, "_blank")}
              data-ocid="document_viewer.primary_button"
            >
              Open in Browser
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

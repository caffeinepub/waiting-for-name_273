import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActor } from "@/hooks/useActor";
import {
  useAddDocument,
  useDeleteDocument,
  useDeletePerson,
  useGetDocumentsForPerson,
  useUpdateDocument,
} from "@/hooks/useQueries";
import { getBlobUrl, uploadFileAndGetBlobId } from "@/utils/storageHelper";
import {
  ArrowLeft,
  Camera,
  Download,
  Eye,
  FileImage,
  FileText,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Share2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Document } from "../backend.d";
import { useCamera } from "../camera/useCamera";

export const DOCUMENT_TYPES = [
  "Aadhaar Card",
  "PAN Card",
  "Voter ID",
  "Driving License",
  "Passport",
  "Passport Size Photo",
  "Birth Certificate",
  "Insurance Policy",
  "Ration Card",
  "10th Marksheet",
  "12th Marksheet",
  "Degree Certificate",
  "Income Certificate",
  "Caste Certificate",
  "Medical Records",
  "Other",
];

interface PersonDetailPageProps {
  personId: bigint;
  navigate: (page: Page) => void;
}

// Detect MIME type from file magic bytes — reliable regardless of server headers
async function detectMimeType(blob: Blob): Promise<string> {
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  // PDF: %PDF
  if (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46
  )
    return "application/pdf";
  // PNG
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  )
    return "image/png";
  // JPEG
  if (header[0] === 0xff && header[1] === 0xd8) return "image/jpeg";
  // GIF
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46)
    return "image/gif";
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
    return "image/webp";
  return blob.type || "image/jpeg";
}

// Infer extension directly from raw bytes (most reliable)
async function inferExtFromBytes(blob: Blob): Promise<string> {
  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (
    header[0] === 0x25 &&
    header[1] === 0x50 &&
    header[2] === 0x44 &&
    header[3] === 0x46
  )
    return "pdf";
  if (
    header[0] === 0x89 &&
    header[1] === 0x50 &&
    header[2] === 0x4e &&
    header[3] === 0x47
  )
    return "png";
  if (header[0] === 0xff && header[1] === 0xd8) return "jpg";
  if (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46)
    return "gif";
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
    return "webp";
  return "jpg";
}

// ─── Update Document Dialog ──────────────────────────────────────────────────

function UpdateDocumentDialog({
  doc,
  personId,
  open,
  onClose,
  dialogId,
}: {
  doc: Document;
  personId: bigint;
  open: boolean;
  onClose: () => void;
  dialogId: string;
}) {
  const [docType, setDocType] = useState(doc.docType);
  const [uploadMethod, setUploadMethod] = useState<"image" | "camera" | "pdf">(
    "image",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const imageInputId = `update-image-${dialogId}`;
  const pdfInputId = `update-pdf-${dialogId}`;

  const camera = useCamera({ facingMode: "environment" });
  const stopCameraRef = useRef(camera.stopCamera);
  stopCameraRef.current = camera.stopCamera;

  const updateDocMutation = useUpdateDocument();
  const deleteDocMutation = useDeleteDocument();
  const addDocMutation = useAddDocument();

  useEffect(() => {
    if (open) {
      setDocType(doc.docType);
      setUploadMethod("image");
      setSelectedFile(null);
      setPreviewUrl(null);
      setUploadProgress(0);
    } else {
      stopCameraRef.current();
    }
  }, [open, doc.docType]);

  useEffect(() => {
    return () => {
      stopCameraRef.current();
    };
  }, []);

  function handleTabChange(val: string) {
    if (uploadMethod === "camera" && val !== "camera") {
      camera.stopCamera();
    }
    setUploadMethod(val as "image" | "camera" | "pdf");
    setSelectedFile(null);
    setPreviewUrl(null);
    if (val === "camera") {
      setTimeout(() => camera.startCamera(), 150);
    }
  }

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "pdf",
  ) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (type === "image") {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleCapture() {
    const file = await camera.capturePhoto();
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSave() {
    const typeChanged = docType !== doc.docType;
    const hasNewFile = !!selectedFile;

    if (!typeChanged && !hasNewFile) {
      toast.error(
        "No changes made. Select a new file or change the document type.",
      );
      return;
    }

    setIsSaving(true);
    try {
      if (typeChanged) {
        let blobId = doc.blobId;
        if (hasNewFile) {
          blobId = await uploadFileAndGetBlobId(
            selectedFile!,
            (pct) => setUploadProgress(pct),
            docType,
          );
        }
        await deleteDocMutation.mutateAsync({ documentId: doc.id, personId });
        await addDocMutation.mutateAsync({ personId, docType, blobId });
      } else if (hasNewFile) {
        const blobId = await uploadFileAndGetBlobId(
          selectedFile!,
          (pct) => setUploadProgress(pct),
          docType,
        );
        await updateDocMutation.mutateAsync({
          documentId: doc.id,
          newBlobId: blobId,
          personId,
        });
      }

      toast.success("Document updated!");
      camera.stopCamera();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update document. Please try again.");
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && !isSaving) onClose();
      }}
    >
      <DialogContent
        className="max-w-md max-h-[90vh] overflow-y-auto"
        data-ocid="person.dialog"
      >
        <DialogHeader>
          <DialogTitle className="font-display text-lg">
            Update Document
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label className="font-semibold">Document Type</Label>
            <Select value={docType} onValueChange={setDocType}>
              <SelectTrigger
                className="h-11 rounded-xl"
                data-ocid="person.select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((dt) => (
                  <SelectItem key={dt} value={dt}>
                    {dt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="font-semibold">
              Replace File{" "}
              <span className="text-muted-foreground font-normal text-xs">
                (optional)
              </span>
            </Label>
            <Tabs value={uploadMethod} onValueChange={handleTabChange}>
              <TabsList className="w-full rounded-xl">
                <TabsTrigger
                  value="image"
                  className="flex-1 gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-ocid="person.tab"
                >
                  <FileImage className="w-3.5 h-3.5" />
                  Image
                </TabsTrigger>
                <TabsTrigger
                  value="camera"
                  className="flex-1 gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-ocid="person.tab"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Camera
                </TabsTrigger>
                <TabsTrigger
                  value="pdf"
                  className="flex-1 gap-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  data-ocid="person.tab"
                >
                  <FileText className="w-3.5 h-3.5" />
                  PDF
                </TabsTrigger>
              </TabsList>

              <TabsContent value="image" className="mt-3">
                <input
                  id={imageInputId}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleFileChange(e, "image")}
                  data-ocid="person.upload_button"
                />
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full max-h-40 rounded-xl object-contain border border-border"
                    />
                    <div className="flex gap-2">
                      <label
                        htmlFor={imageInputId}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-border bg-background text-xs font-medium cursor-pointer hover:bg-secondary/50 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Change
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor={imageInputId}
                    className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:bg-secondary/50 transition-colors block"
                    data-ocid="person.dropzone"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground" />
                    <p className="text-muted-foreground text-xs text-center">
                      Tap to select an image
                    </p>
                  </label>
                )}
              </TabsContent>

              <TabsContent value="camera" className="mt-3 space-y-3">
                {camera.error ? (
                  <div
                    className="text-center py-6 text-destructive"
                    data-ocid="person.error_state"
                  >
                    <p className="font-medium text-sm">
                      {camera.error.message}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => camera.retry()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                      <video
                        ref={camera.videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <canvas ref={camera.canvasRef} className="hidden" />
                      {!camera.isActive && !camera.isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                          <Button
                            onClick={() => camera.startCamera()}
                            size="sm"
                            className="gap-2"
                            data-ocid="person.button"
                          >
                            <Camera className="w-4 h-4" />
                            Start Camera
                          </Button>
                        </div>
                      )}
                      {camera.isLoading && (
                        <div
                          className="absolute inset-0 flex items-center justify-center bg-black/60"
                          data-ocid="person.loading_state"
                        >
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                    {previewUrl ? (
                      <div className="space-y-2">
                        <img
                          src={previewUrl}
                          alt="Captured"
                          className="w-full rounded-xl object-contain max-h-40"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl(null);
                          }}
                        >
                          Retake
                        </Button>
                      </div>
                    ) : (
                      camera.isActive && (
                        <Button
                          className="w-full gap-2"
                          size="sm"
                          onClick={handleCapture}
                          data-ocid="person.secondary_button"
                        >
                          <Camera className="w-4 h-4" />
                          Capture Photo
                        </Button>
                      )
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pdf" className="mt-3">
                <input
                  id={pdfInputId}
                  type="file"
                  accept="application/pdf"
                  className="sr-only"
                  onChange={(e) => handleFileChange(e, "pdf")}
                  data-ocid="person.upload_button"
                />
                {selectedFile ? (
                  <div className="space-y-2">
                    <div className="border border-border rounded-xl p-3 flex items-center gap-2">
                      <FileText className="w-6 h-6 text-muted-foreground shrink-0" />
                      <p className="text-xs font-medium text-foreground truncate">
                        {selectedFile.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <label
                        htmlFor={pdfInputId}
                        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border border-border bg-background text-xs font-medium cursor-pointer hover:bg-secondary/50 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Change
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedFile(null)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor={pdfInputId}
                    className="w-full border-2 border-dashed border-border rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer hover:bg-secondary/50 transition-colors block"
                    data-ocid="person.dropzone"
                  >
                    <FileText className="w-8 h-8 text-muted-foreground" />
                    <p className="text-muted-foreground text-xs text-center">
                      Tap to select a PDF
                    </p>
                  </label>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {isSaving && uploadProgress > 0 && uploadProgress < 100 && (
            <div className="space-y-1" data-ocid="person.loading_state">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSaving}
              data-ocid="person.cancel_button"
            >
              Cancel
            </Button>
            <Button
              className="flex-1 gap-2"
              onClick={handleSave}
              disabled={isSaving}
              data-ocid="person.save_button"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── View Document Dialog ────────────────────────────────────────────────────

function ViewDocumentDialog({
  doc,
  blobUrl,
  open,
  onClose,
  mimeType,
}: {
  doc: Document;
  blobUrl: string;
  open: boolean;
  onClose: () => void;
  mimeType: string;
}) {
  const isPdf = mimeType === "application/pdf";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-3xl w-full p-0 overflow-hidden"
        data-ocid="person.modal"
        showCloseButton={false}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-base truncate">{doc.docType}</h2>
          <div className="flex items-center gap-2">
            {isPdf && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() =>
                  window.open(blobUrl, "_blank", "noopener,noreferrer")
                }
              >
                <Eye className="w-3.5 h-3.5" />
                Open in browser
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={onClose}
              data-ocid="person.close_button"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        {isPdf ? (
          <div className="h-[80vh] flex flex-col">
            <iframe
              src={blobUrl}
              className="w-full flex-1 border-0"
              title={doc.docType}
            />
          </div>
        ) : (
          <div
            className="flex items-center justify-center bg-black/5 overflow-auto"
            style={{ maxHeight: "80vh" }}
          >
            <img
              src={blobUrl}
              alt={doc.docType}
              className="max-w-full max-h-[80vh] object-contain"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Doc Card ────────────────────────────────────────────────────────────────

function DocCard({
  doc,
  personId,
  index,
}: { doc: Document; personId: bigint; index: number }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const blobUrlRef = useRef<string | null>(null);

  const isPdf = mimeType === "application/pdf";

  useEffect(() => {
    if (!doc.blobId) return;
    let cancelled = false;

    getBlobUrl(doc.blobId)
      .then(async (directUrl) => {
        const response = await fetch(directUrl);
        const rawBlob = await response.blob();
        const detected = await detectMimeType(rawBlob);
        if (cancelled) return;
        // Create a typed blob URL so the browser knows the MIME type
        const typedBlob = new Blob([await rawBlob.arrayBuffer()], {
          type: detected,
        });
        const objectUrl = URL.createObjectURL(typedBlob);
        blobUrlRef.current = objectUrl;
        setBlobUrl(objectUrl);
        setMimeType(detected);
      })
      .catch(() => setBlobUrl(null));

    return () => {
      cancelled = true;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [doc.blobId]);

  const { isPending, mutate: deleteDoc } = useDeleteDocument();

  function handleDelete() {
    deleteDoc(
      { documentId: doc.id, personId },
      {
        onSuccess: () => toast.success("Document deleted"),
        onError: () => toast.error("Failed to delete document"),
      },
    );
  }

  async function handleDownload() {
    if (!blobUrl) return;
    try {
      const response = await fetch(blobUrl);
      const rawBlob = await response.blob();
      // Infer extension from actual file bytes - reliable regardless of stored MIME type
      const ext = await inferExtFromBytes(rawBlob);
      const filename = `${doc.docType}.${ext}`;
      // Create a typed blob so the browser downloads it in the correct format
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        jpg: "image/jpeg",
      };
      const typedBlob = new Blob([await rawBlob.arrayBuffer()], {
        type: mimeMap[ext] || "application/octet-stream",
      });
      const downloadUrl = URL.createObjectURL(typedBlob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
    } catch {
      toast.error("Failed to download document");
    }
  }

  async function handleShare() {
    if (!blobUrl) return;
    try {
      const response = await fetch(blobUrl);
      const rawBlob = await response.blob();
      const ext = await inferExtFromBytes(rawBlob);
      const mimeMap: Record<string, string> = {
        pdf: "application/pdf",
        png: "image/png",
        gif: "image/gif",
        webp: "image/webp",
        jpg: "image/jpeg",
      };
      const detectedMime = mimeMap[ext] || "application/octet-stream";
      const filename = `${doc.docType}.${ext}`;
      const file = new File([rawBlob], filename, { type: detectedMime });

      if (
        navigator.share &&
        navigator.canShare &&
        navigator.canShare({ files: [file] })
      ) {
        await navigator.share({ title: doc.docType, files: [file] });
      } else if (navigator.share) {
        await navigator.share({
          title: doc.docType,
          text: doc.docType,
          url: blobUrl,
        });
      } else {
        await navigator.clipboard.writeText(blobUrl);
        toast.success("Link copied to clipboard");
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        try {
          await navigator.clipboard.writeText(blobUrl);
          toast.success("Link copied to clipboard");
        } catch {
          toast.error("Could not share document");
        }
      }
    }
  }

  return (
    <>
      <Card className="rounded-xl border-border overflow-hidden shadow-xs">
        <div className="h-36 bg-secondary flex items-center justify-center relative">
          {blobUrl && !isPdf ? (
            <img
              src={blobUrl}
              alt={doc.docType}
              className="w-full h-full object-cover"
            />
          ) : blobUrl && isPdf ? (
            <div className="flex flex-col items-center gap-2 text-accent">
              <FileText className="w-12 h-12" />
              <span className="text-xs font-medium">PDF Document</span>
            </div>
          ) : (
            <div
              className="flex flex-col items-center gap-2"
              data-ocid="person.loading_state"
            >
              <ImageIcon className="w-10 h-10 text-muted-foreground" />
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>

        <CardContent className="p-3 space-y-2">
          <p className="font-semibold text-sm text-foreground truncate">
            {doc.docType}
          </p>

          <Button
            size="sm"
            variant="secondary"
            className="w-full gap-1.5 text-xs h-8"
            onClick={() => setViewOpen(true)}
            disabled={!blobUrl}
            data-ocid="person.button"
          >
            <Eye className="w-3.5 h-3.5" />
            View
          </Button>

          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 p-0"
              onClick={handleDownload}
              disabled={!blobUrl}
              title="Download"
              data-ocid="person.secondary_button"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 p-0"
              onClick={handleShare}
              disabled={!blobUrl}
              title="Share"
              data-ocid="person.secondary_button"
            >
              <Share2 className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 p-0"
              onClick={() => setEditOpen(true)}
              title="Update"
              data-ocid="person.edit_button"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-8 p-0 text-destructive border-destructive/30 hover:bg-destructive/10"
              onClick={handleDelete}
              disabled={isPending}
              title="Delete"
              data-ocid="person.delete_button"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {blobUrl && (
        <ViewDocumentDialog
          doc={doc}
          blobUrl={blobUrl}
          open={viewOpen}
          onClose={() => setViewOpen(false)}
          mimeType={mimeType}
        />
      )}

      <UpdateDocumentDialog
        doc={doc}
        personId={personId}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        dialogId={`${doc.id.toString()}-${index}`}
      />
    </>
  );
}

// ─── Person Detail Page ──────────────────────────────────────────────────────

export default function PersonDetailPage({
  personId,
  navigate,
}: PersonDetailPageProps) {
  const { actor } = useActor();
  const [personName, setPersonName] = useState<string | null>(null);
  const [deleteProfileOpen, setDeleteProfileOpen] = useState(false);
  const { data: documents, isLoading } = useGetDocumentsForPerson(personId);
  const deletePersonMutation = useDeletePerson();

  useEffect(() => {
    if (!actor) return;
    actor.getPerson(personId).then((p) => {
      if (p) setPersonName(p.name);
    });
  }, [actor, personId]);

  async function handleDeleteProfile() {
    try {
      await deletePersonMutation.mutateAsync(personId);
      toast.success("Profile deleted");
      navigate({ name: "home" });
    } catch {
      toast.error("Failed to delete profile");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card shadow-xs sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate({ name: "home" })}
            data-ocid="person.link"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold font-display leading-tight">
              {personName ?? "Loading..."}
            </h1>
            <p className="text-xs text-muted-foreground">
              {documents?.length ?? 0} document
              {documents?.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            onClick={() => setDeleteProfileOpen(true)}
            title="Delete profile"
            data-ocid="person.delete_button"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
        {isLoading ? (
          <div
            className="grid grid-cols-2 gap-3"
            data-ocid="person.loading_state"
          >
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-52 rounded-xl" />
            ))}
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {documents.map((doc, index) => (
              <div
                key={doc.id.toString()}
                data-ocid={`person.item.${index + 1}`}
              >
                <DocCard doc={doc} personId={personId} index={index} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-16 flex flex-col items-center gap-4"
            data-ocid="person.empty_state"
          >
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <FileText className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold mb-1">No documents yet</p>
              <p className="text-sm text-muted-foreground">
                Add the first document for {personName ?? "this person"}.
              </p>
            </div>
          </div>
        )}
      </main>

      <button
        type="button"
        onClick={() =>
          navigate({ name: "addDocument", prefillPersonId: personId })
        }
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-20"
        aria-label="Add document"
        data-ocid="person.primary_button"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Delete Profile Confirmation Dialog */}
      <Dialog open={deleteProfileOpen} onOpenChange={setDeleteProfileOpen}>
        <DialogContent data-ocid="person.dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Profile?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {personName}
              </span>
              ? This will permanently remove their profile and cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteProfileOpen(false)}
                disabled={deletePersonMutation.isPending}
                data-ocid="person.cancel_button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={handleDeleteProfile}
                disabled={deletePersonMutation.isPending}
                data-ocid="person.confirm_button"
              >
                {deletePersonMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <footer className="border-t border-border py-4 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="underline hover:text-foreground transition-colors"
          target="_blank"
          rel="noreferrer"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}

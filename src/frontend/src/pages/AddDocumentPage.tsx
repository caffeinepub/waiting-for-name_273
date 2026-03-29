import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActor } from "@/hooks/useActor";
import {
  useAddDocument,
  useAddPerson,
  useGetAllPersons,
} from "@/hooks/useQueries";
import { uploadFileAndGetBlobId } from "@/utils/storageHelper";
import {
  ArrowLeft,
  Camera,
  FileImage,
  FileText,
  Loader2,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import { useCamera } from "../camera/useCamera";

const DOCUMENT_TYPES = [
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

interface AddDocumentPageProps {
  prefillPersonId?: bigint;
  navigate: (page: Page) => void;
}

export default function AddDocumentPage({
  prefillPersonId,
  navigate,
}: AddDocumentPageProps) {
  const { actor } = useActor();
  const { data: persons } = useGetAllPersons();
  const addPersonMutation = useAddPerson();
  const addDocumentMutation = useAddDocument();

  const [personName, setPersonName] = useState("");
  const [docType, setDocType] = useState("");
  const [uploadMethod, setUploadMethod] = useState<"image" | "camera" | "pdf">(
    "image",
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const imageInputId = "add-doc-image-input";
  const pdfInputId = "add-doc-pdf-input";

  const camera = useCamera({ facingMode: "environment" });
  const stopCameraRef = useRef(camera.stopCamera);
  stopCameraRef.current = camera.stopCamera;

  // Prefill person name if personId given
  useEffect(() => {
    if (prefillPersonId && actor) {
      actor.getPerson(prefillPersonId).then((p) => {
        if (p) setPersonName(p.name);
      });
    }
  }, [prefillPersonId, actor]);

  // Stop camera on unmount
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
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  }

  async function handleCapture() {
    const file = await camera.capturePhoto();
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }

  async function handleSave() {
    if (!personName.trim()) {
      toast.error("Please enter a person name");
      return;
    }
    if (!docType) {
      toast.error("Please select a document type");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select or capture a file");
      return;
    }

    setIsSaving(true);
    try {
      const blobId = await uploadFileAndGetBlobId(
        selectedFile,
        (pct) => setUploadProgress(pct),
        docType,
      );

      let personId: bigint;
      const existing = persons?.find(
        (p) => p.name.toLowerCase() === personName.trim().toLowerCase(),
      );
      if (existing) {
        personId = existing.id;
      } else {
        personId = await addPersonMutation.mutateAsync(personName.trim());
      }

      await addDocumentMutation.mutateAsync({ personId, docType, blobId });

      toast.success("Document saved!");
      camera.stopCamera();
      navigate({ name: "personDetail", personId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to save document. Please try again.");
    } finally {
      setIsSaving(false);
      setUploadProgress(0);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card shadow-xs sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              camera.stopCamera();
              navigate(
                prefillPersonId
                  ? { name: "personDetail", personId: prefillPersonId }
                  : { name: "home" },
              );
            }}
            data-ocid="adddoc.link"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold font-display">Add Document</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-5 pb-32">
        {/* Person Name */}
        <div className="space-y-2">
          <Label htmlFor="person-name" className="text-base font-semibold">
            Full Name
          </Label>
          <Input
            id="person-name"
            list="persons-list"
            placeholder="Enter or select a name..."
            value={personName}
            onChange={(e) => setPersonName(e.target.value)}
            className="h-12 text-base rounded-xl"
            data-ocid="adddoc.input"
          />
          <datalist id="persons-list">
            {persons?.map((p) => (
              <option key={p.id.toString()} value={p.name} />
            ))}
          </datalist>
        </div>

        {/* Document Type */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger
              className="h-12 text-base rounded-xl"
              data-ocid="adddoc.select"
            >
              <SelectValue placeholder="Select document type..." />
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {DOCUMENT_TYPES.map((dt) => (
                <SelectItem key={dt} value={dt}>
                  {dt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Upload Method */}
        <div className="space-y-2">
          <Label className="text-base font-semibold">Select a Document</Label>
          <Tabs
            value={uploadMethod}
            onValueChange={handleTabChange}
            data-ocid="adddoc.tab"
          >
            <TabsList className="w-full h-12 rounded-xl">
              <TabsTrigger
                value="image"
                className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-ocid="adddoc.tab"
              >
                <FileImage className="w-4 h-4" />
                Image
              </TabsTrigger>
              <TabsTrigger
                value="camera"
                className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-ocid="adddoc.tab"
              >
                <Camera className="w-4 h-4" />
                Camera
              </TabsTrigger>
              <TabsTrigger
                value="pdf"
                className="flex-1 gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                data-ocid="adddoc.tab"
              >
                <FileText className="w-4 h-4" />
                PDF
              </TabsTrigger>
            </TabsList>

            {/* Image Tab */}
            <TabsContent value="image" className="mt-4">
              {/* Hidden file input */}
              <input
                id={imageInputId}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => handleFileChange(e, "image")}
                data-ocid="adddoc.upload_button"
              />
              {previewUrl ? (
                <div className="space-y-2">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full max-h-56 rounded-xl object-contain border border-border"
                  />
                  <div className="flex gap-2">
                    <label
                      htmlFor={imageInputId}
                      className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-background text-sm font-medium cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Change Image
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10"
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
                  className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors block"
                  data-ocid="adddoc.dropzone"
                >
                  <Upload className="w-10 h-10 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm text-center">
                    Tap to select an image file
                  </p>
                </label>
              )}
            </TabsContent>

            {/* Camera Tab */}
            <TabsContent value="camera" className="mt-4 space-y-3">
              {camera.error ? (
                <div
                  className="text-center py-8 text-destructive"
                  data-ocid="adddoc.error_state"
                >
                  <p className="font-medium">{camera.error.message}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => camera.retry()}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
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
                          className="gap-2"
                          data-ocid="adddoc.button"
                        >
                          <Camera className="w-4 h-4" />
                          Start Camera
                        </Button>
                      </div>
                    )}
                    {camera.isLoading && (
                      <div
                        className="absolute inset-0 flex items-center justify-center bg-black/60"
                        data-ocid="adddoc.loading_state"
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
                        className="w-full rounded-xl object-contain max-h-56"
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
                        className="w-full h-12 gap-2"
                        onClick={handleCapture}
                        data-ocid="adddoc.secondary_button"
                      >
                        <Camera className="w-4 h-4" />
                        Capture Photo
                      </Button>
                    )
                  )}
                </div>
              )}
            </TabsContent>

            {/* PDF Tab */}
            <TabsContent value="pdf" className="mt-4">
              {/* Hidden file input */}
              <input
                id={pdfInputId}
                type="file"
                accept="application/pdf"
                className="sr-only"
                onChange={(e) => handleFileChange(e, "pdf")}
                data-ocid="adddoc.upload_button"
              />
              {selectedFile ? (
                <div className="space-y-2">
                  <div className="border border-border rounded-xl p-4 flex items-center gap-3">
                    <FileText className="w-8 h-8 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">
                      {selectedFile.name}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <label
                      htmlFor={pdfInputId}
                      className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border bg-background text-sm font-medium cursor-pointer hover:bg-secondary/50 transition-colors"
                    >
                      <Upload className="w-4 h-4" />
                      Change PDF
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10"
                      onClick={() => setSelectedFile(null)}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor={pdfInputId}
                  className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-secondary/50 transition-colors block"
                  data-ocid="adddoc.dropzone"
                >
                  <FileText className="w-10 h-10 text-muted-foreground" />
                  <p className="text-muted-foreground text-sm text-center">
                    Tap to select a PDF file
                  </p>
                </label>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Upload Progress */}
        {isSaving && uploadProgress > 0 && uploadProgress < 100 && (
          <div className="space-y-1" data-ocid="adddoc.loading_state">
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
      </main>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="max-w-2xl mx-auto">
          <Button
            className="w-full h-14 text-base rounded-xl gap-2"
            onClick={handleSave}
            disabled={isSaving || !personName || !docType || !selectedFile}
            data-ocid="adddoc.submit_button"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Document"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

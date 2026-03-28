import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useActor } from "@/hooks/useActor";
import {
  useDeletePerson,
  useGetAllPersons,
  usePreloadAllDocuments,
} from "@/hooks/useQueries";
import { generateExcel } from "@/utils/excelExport";
import type { DocRow } from "@/utils/excelExport";
import { extractValueFromDocument } from "@/utils/ocrExtract";
import { getBlobUrl } from "@/utils/storageHelper";
import {
  FileSpreadsheet,
  Folder,
  Loader2,
  LogOut,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { Page } from "../App";
import type { Document } from "../backend.d";

interface HomePageProps {
  onLogout: () => void;
  navigate: (page: Page) => void;
}

export default function HomePage({ onLogout, navigate }: HomePageProps) {
  const [search, setSearch] = useState("");
  const { data: persons, isLoading } = useGetAllPersons();
  const deletePersonMutation = useDeletePerson();
  const { actor } = useActor();
  const [deleteTarget, setDeleteTarget] = useState<{
    id: bigint;
    name: string;
  } | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Pre-fetch all documents in the background so person detail pages load instantly
  usePreloadAllDocuments();

  // Long-press detection
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  function startLongPress(id: bigint, name: string) {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setDeleteTarget({ id, name });
    }, 600);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleCardClick(id: bigint) {
    if (didLongPress.current) {
      didLongPress.current = false;
      return;
    }
    navigate({ name: "personDetail", personId: id });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    try {
      await deletePersonMutation.mutateAsync(deleteTarget.id);
      toast.success("Profile deleted");
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete profile");
    }
  }

  async function handleExport() {
    if (!actor || !persons) return;
    setIsExporting(true);
    try {
      // Deduplicate persons by name (case-insensitive)
      const seen = new Set<string>();
      const uniquePersons = persons.filter((p) => {
        const key = p.name.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      const allDocs: Document[] = await actor.getAllDocuments();

      // Group docs by personId
      const docsByPerson = new Map<string, Document[]>();
      for (const doc of allDocs) {
        const key = doc.personId.toString();
        if (!docsByPerson.has(key)) docsByPerson.set(key, []);
        docsByPerson.get(key)!.push(doc);
      }

      const rows: DocRow[] = await Promise.all(
        uniquePersons.map(async (person) => {
          const docs = docsByPerson.get(person.id.toString()) ?? [];

          // For each doc type, keep most recent (highest createdAt)
          const latestByType = new Map<string, Document>();
          for (const doc of docs) {
            const existing = latestByType.get(doc.docType);
            if (!existing || doc.createdAt > existing.createdAt) {
              latestByType.set(doc.docType, doc);
            }
          }

          // Extract values from each document
          const extracted = new Map<string, { value: string; dob: string }>();
          await Promise.all(
            Array.from(latestByType.entries()).map(async ([type, doc]) => {
              try {
                const url = await getBlobUrl(doc.blobId);
                const result = await extractValueFromDocument(url, type);
                extracted.set(type, result);
              } catch {
                extracted.set(type, { value: "Uploaded", dob: "" });
              }
            }),
          );

          // Find first non-empty DOB
          let dob = "";
          for (const result of extracted.values()) {
            if (result.dob) {
              dob = result.dob;
              break;
            }
          }

          const val = (type: string) => extracted.get(type)?.value ?? "";

          return {
            name: person.name,
            dob,
            aadhaarNo: val("Aadhaar Card"),
            panNo: val("PAN Card"),
            voterId: val("Voter ID"),
            drivingLicenseNo: val("Driving License"),
            passportNo: val("Passport"),
            passportSizePhoto: val("Passport Size Photo"),
            birthCertificate: val("Birth Certificate"),
            insurancePolicy: val("Insurance Policy"),
            rationCard: val("Ration Card"),
            marksheet10th: val("10th Marksheet"),
            marksheet12th: val("12th Marksheet"),
            degreeCertificate: val("Degree Certificate"),
            incomeCertificate: val("Income Certificate"),
            casteCertificate: val("Caste Certificate"),
            medicalRecords: val("Medical Records"),
            other: val("Other"),
          };
        }),
      );

      generateExcel(rows);
      toast.success("Excel file downloaded!");
    } catch {
      toast.error("Failed to export. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  const filtered = useMemo(() => {
    if (!persons) return [];
    // Deduplicate by name (case-insensitive, trimmed) — keep first occurrence
    const seen = new Set<string>();
    const unique = persons.filter((p) => {
      const key = p.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    const q = search.trim().toLowerCase();
    if (!q) return unique;
    return unique.filter((p) => p.name.toLowerCase().includes(q));
  }, [persons, search]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b border-border bg-card shadow-xs sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Folder className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight font-display">
              Family Documents
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              className="gap-2"
              data-ocid="home.secondary_button"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              {isExporting ? "Exporting..." : "Export"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onLogout}
              className="gap-2"
              data-ocid="home.button"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 pb-24">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search family members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 text-base rounded-xl"
            data-ocid="home.search_input"
          />
        </div>

        {isLoading ? (
          <div
            className="grid grid-cols-2 gap-3"
            data-ocid="home.loading_state"
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-16 flex flex-col items-center gap-4"
            data-ocid="home.empty_state"
          >
            <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
              <Users className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground mb-1">
                {search ? "No matches found" : "No family members yet"}
              </p>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                {search
                  ? "Try a different search term."
                  : "Tap the + button to add a family member and their documents."}
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((person, index) => (
              <Card
                key={person.id.toString()}
                className="cursor-pointer hover:shadow-card transition-shadow rounded-xl border-border active:scale-95 select-none"
                onClick={() => handleCardClick(person.id)}
                onMouseDown={() => startLongPress(person.id, person.name)}
                onMouseUp={cancelLongPress}
                onMouseLeave={cancelLongPress}
                onTouchStart={() => startLongPress(person.id, person.name)}
                onTouchEnd={cancelLongPress}
                onTouchMove={cancelLongPress}
                data-ocid={`person.item.${index + 1}`}
              >
                <CardContent className="p-4 flex flex-col gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg font-display">
                      {person.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground leading-tight">
                      {person.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hold to delete · Tap to view
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <button
        type="button"
        onClick={() => navigate({ name: "addDocument" })}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-transform z-20"
        aria-label="Add document"
        data-ocid="home.primary_button"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Long-press delete confirmation */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent data-ocid="home.dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete Profile?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-foreground">
                {deleteTarget?.name}
              </span>
              ? This will permanently remove their profile and all their
              documents.
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setDeleteTarget(null)}
                disabled={deletePersonMutation.isPending}
                data-ocid="home.cancel_button"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={handleDeleteConfirm}
                disabled={deletePersonMutation.isPending}
                data-ocid="home.confirm_button"
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

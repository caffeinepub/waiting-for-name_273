import { Toaster } from "@/components/ui/sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import AddDocumentPage from "./pages/AddDocumentPage";
import DocumentViewerPage from "./pages/DocumentViewerPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PersonDetailPage from "./pages/PersonDetailPage";

export type Page =
  | { name: "home" }
  | { name: "personDetail"; personId: bigint }
  | { name: "addDocument"; prefillPersonId?: bigint };

export default function App() {
  // Always start logged out — never persist login in localStorage for security
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [page, setPage] = useState<Page>({ name: "home" });
  const [viewerBlobId, setViewerBlobId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("view");
  });
  const queryClient = useQueryClient();

  function handleLogin() {
    // Invalidate data queries so they refetch fresh, but keep actor cached for instant load
    queryClient.invalidateQueries({ queryKey: ["persons"] });
    queryClient.invalidateQueries({ queryKey: ["allDocuments"] });
    setIsLoggedIn(true);
  }

  function handleLogout() {
    queryClient.clear();
    setIsLoggedIn(false);
    setPage({ name: "home" });
  }

  function navigate(p: Page) {
    setPage(p);
  }

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage onLogin={handleLogin} />
        <Toaster />
      </>
    );
  }

  if (viewerBlobId) {
    return (
      <>
        <DocumentViewerPage
          blobId={viewerBlobId}
          onClose={() => {
            setViewerBlobId(null);
            window.history.replaceState({}, "", window.location.pathname);
          }}
        />
        <Toaster />
      </>
    );
  }

  return (
    <>
      {page.name === "home" && (
        <HomePage onLogout={handleLogout} navigate={navigate} />
      )}
      {page.name === "personDetail" && (
        <PersonDetailPage personId={page.personId} navigate={navigate} />
      )}
      {page.name === "addDocument" && (
        <AddDocumentPage
          prefillPersonId={page.prefillPersonId}
          navigate={navigate}
        />
      )}
      <Toaster />
    </>
  );
}

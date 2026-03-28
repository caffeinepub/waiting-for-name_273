import { Toaster } from "@/components/ui/sonner";
import { useState } from "react";
import AddDocumentPage from "./pages/AddDocumentPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import PersonDetailPage from "./pages/PersonDetailPage";

export type Page =
  | { name: "home" }
  | { name: "personDetail"; personId: bigint }
  | { name: "addDocument"; prefillPersonId?: bigint };

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => localStorage.getItem("family_auth") === "true",
  );
  const [page, setPage] = useState<Page>({ name: "home" });

  function handleLogin() {
    localStorage.setItem("family_auth", "true");
    setIsLoggedIn(true);
  }

  function handleLogout() {
    localStorage.removeItem("family_auth");
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

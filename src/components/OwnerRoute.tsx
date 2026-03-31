import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function getOwnerEmails(): string[] {
  const raw = (import.meta.env.VITE_OWNER_EMAILS || "").toString();
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function OwnerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const ownerEmails = getOwnerEmails();
  const userEmail = user?.email?.toLowerCase() || "";
  const isOwner = userEmail && ownerEmails.includes(userEmail);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Ellenőrzés...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isOwner) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold mb-4">Hozzáférés megtagadva</h1>
          <p className="text-muted-foreground mb-6">
            Ez az oldal csak a rendszer tulajdonosának érhető el.
          </p>
          <a href="/" className="text-primary hover:underline">Vissza a kezdőlapra</a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

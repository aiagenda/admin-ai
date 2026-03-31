import { Home, Upload, Archive, Search, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

function Item({ to, label, icon, active }: { to: string; label: string; icon: React.ReactNode; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-1 flex-col items-center justify-center gap-1 py-2 text-xs min-h-[56px] ${
        active ? "text-primary" : "text-muted-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) return null;

  const hiddenPrefixes = ["/auth", "/admin", "/checkout"];
  if (hiddenPrefixes.some((p) => pathname.startsWith(p))) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="grid grid-cols-5 px-2 pb-[env(safe-area-inset-bottom)]">
        <Item to="/" label="Kezdőlap" icon={<Home className="h-4 w-4" />} active={pathname === "/"} />
        <Item to="/upload" label="Feltöltés" icon={<Upload className="h-4 w-4" />} active={pathname.startsWith("/upload")} />
        <Item to="/archive" label="Archívum" icon={<Archive className="h-4 w-4" />} active={pathname.startsWith("/archive") || pathname.startsWith("/result")} />
        <Item to="/search" label="Keresés" icon={<Search className="h-4 w-4" />} active={pathname.startsWith("/search")} />
        <Item to="/settings" label="Profil" icon={<User className="h-4 w-4" />} active={pathname.startsWith("/settings")} />
      </div>
    </nav>
  );
}

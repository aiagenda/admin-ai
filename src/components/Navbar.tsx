import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, LogOut, User, HelpCircle, Menu, Moon, Sun, Receipt, Layers, ShieldCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hasInvoiceAccess, setHasInvoiceAccess] = useState(false);

  const ownerEmailsRaw = (import.meta.env.VITE_OWNER_EMAILS || "").toString();
  const ownerEmails = ownerEmailsRaw.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const isOwner = !!user?.email && ownerEmails.includes(user.email.toLowerCase());

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    async function checkAdminRole() {
      if (!user) {
        setIsAdmin(false);
        setCheckingAdmin(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("is_admin");
        if (error) setIsAdmin(false);
        else setIsAdmin(data === true);
      } catch {
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    }

    checkAdminRole();
  }, [user]);

  const invoiceAccessForAll = import.meta.env.VITE_INVOICE_ACCESS_FOR_ALL !== "false";
  useEffect(() => {
    async function checkInvoiceAccess() {
      if (!user) {
        setHasInvoiceAccess(false);
        return;
      }
      if (invoiceAccessForAll) {
        setHasInvoiceAccess(true);
        return;
      }
      try {
        const { data: adminData } = await supabase.rpc("is_admin");
        if (adminData === true) {
          setHasInvoiceAccess(true);
          return;
        }

        try {
          const { data } = await (supabase.rpc as any)("can_access_invoices", { _user_id: user.id });
          if (data === true) {
            setHasInvoiceAccess(true);
            return;
          }
        } catch {
          // ignore
        }

        const { data: subData } = await (supabase
          .from("user_subscriptions" as any)
          .select("plan_type")
          .eq("user_id", user.id)
          .single()) as { data: { plan_type: string } | null };

        setHasInvoiceAccess(subData?.plan_type === "enterprise");
      } catch {
        setHasInvoiceAccess(false);
      }
    }

    checkInvoiceAccess();
  }, [user, invoiceAccessForAll]);

  const NavLink = ({ to, children, className = "" }: { to: string; children: React.ReactNode; className?: string }) => (
    <SheetClose asChild>
      <Link
        to={to}
        className={`text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2 ${className}`}
      >
        {children}
      </Link>
    </SheetClose>
  );

  const SolutionsDropdown = ({ mobile = false }: { mobile?: boolean }) => {
    if (mobile) {
      return (
        <>
          <p className="text-xs uppercase tracking-wide text-muted-foreground px-2 pt-2">Megoldások</p>
          <NavLink to="/nav-hatarozat-ertelmezes">NAV határozat értelmezés</NavLink>
          <NavLink to="/szamla-ocr">Számla OCR</NavLink>
          <NavLink to="/dokumentum-archivum">Dokumentum archívum</NavLink>
          <NavLink to="/adminai-vs-chatgpt">AdminAI vs ChatGPT</NavLink>
          <NavLink to="/adminai-vs-billingo">AdminAI vs Billingo</NavLink>
          <NavLink to="/adminai-vs-szamlazz">AdminAI vs Számlázz.hu</NavLink>
        </>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-sm font-medium min-h-[44px] px-2">
            <Layers className="h-4 w-4 mr-1" />
            Megoldások
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => navigate("/nav-hatarozat-ertelmezes")}>NAV határozat értelmezés</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/szamla-ocr")}>Számla OCR</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/dokumentum-archivum")}>Dokumentum archívum</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/adminai-vs-chatgpt")}>AdminAI vs ChatGPT</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/adminai-vs-billingo")}>AdminAI vs Billingo</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/adminai-vs-szamlazz")}>AdminAI vs Számlázz.hu</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const DesktopPublicLinks = () => (
    <>
      <SolutionsDropdown />
      <Link to="/arak" data-tour="nav-pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        Árak
      </Link>
      <Link to="/blog" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        Blog
      </Link>
      <Link to="/gyik" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        GYIK
      </Link>
    </>
  );

  const DesktopAppLinks = () => (
    <>
      <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        Dashboard
      </Link>
      <Link to="/upload" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        Feltöltés
      </Link>
      <Link to="/archive" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        Archívum
      </Link>
      <Link to="/search" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        Keresés
      </Link>
      {(hasInvoiceAccess || isAdmin) && (
        <Link to="/invoices" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2 gap-1">
          <Receipt className="h-4 w-4" />
          Könyvelés
        </Link>
      )}
      {!checkingAdmin && isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-sm font-medium min-h-[44px] px-2">
              <ShieldCheck className="h-4 w-4 mr-1" />
              Admin
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => navigate("/admin/forms")}>Űrlapkezelő</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/analytics")}>Analitika</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/knowledge-base")}>Knowledge Base</DropdownMenuItem>
            {isOwner && <DropdownMenuItem onClick={() => navigate("/admin/ai-studio")}>AI Studio</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );

  const mobileNavLinks = (
    <>
      {!user ? (
        <>
          <NavLink to="/">Főoldal</NavLink>
          <NavLink to="/arak">Árak</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/gyik">GYIK</NavLink>
          <NavLink to="/help">Segítség</NavLink>
          <SolutionsDropdown mobile />
        </>
      ) : (
        <>
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/upload">Feltöltés</NavLink>
          <NavLink to="/archive">Archívum</NavLink>
          <NavLink to="/search">Keresés</NavLink>
          {(hasInvoiceAccess || isAdmin) && <NavLink to="/invoices">Könyvelés</NavLink>}
          <NavLink to="/settings">Beállítások</NavLink>
          <NavLink to="/blog">Blog</NavLink>
          <NavLink to="/gyik">GYIK</NavLink>
          <NavLink to="/help">Segítség</NavLink>
          {!checkingAdmin && isAdmin && (
            <>
              <p className="text-xs uppercase tracking-wide text-muted-foreground px-2 pt-2">Admin</p>
              <NavLink to="/admin/forms">Űrlapkezelő</NavLink>
              <NavLink to="/admin/analytics">Analitika</NavLink>
              <NavLink to="/admin/knowledge-base">Knowledge Base</NavLink>
              {isOwner && <NavLink to="/admin/ai-studio">AI Studio</NavLink>}
            </>
          )}
        </>
      )}
    </>
  );

  return (
    <nav className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg sm:text-xl text-primary touch-manipulation min-h-[44px]">
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>AdminAI</span>
          </Link>

          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            {user ? <DesktopAppLinks /> : <DesktopPublicLinks />}

            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="min-h-[44px] min-w-[44px] touch-manipulation"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-h-[44px] touch-manipulation" data-tour="nav-profile">
                    <User className="h-4 w-4" />
                    <span>Profil</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/upload")}>Dokumentum feltöltése</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>Beállítások</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/gyik")}>GYIK</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/help")}>
                    <HelpCircle className="h-4 w-4 mr-2" />
                    Segítő
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Kijelentkezés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/auth")} size="sm" className="min-h-[44px] touch-manipulation">
                Bejelentkezés
              </Button>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="min-h-[44px] min-w-[44px] p-2 touch-manipulation"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-h-[44px] min-w-[44px] p-2 touch-manipulation">
                    <User className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/upload")}>Dokumentum feltöltése</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>Beállítások</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/help")}>Segítő</DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Kijelentkezés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/auth")} size="sm" className="min-h-[44px] px-3 touch-manipulation text-xs sm:text-sm">
                Belépés
              </Button>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] p-2 touch-manipulation">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menü megnyitása</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menü</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 mt-6">{mobileNavLinks}</div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}

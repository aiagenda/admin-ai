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
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { isUsMarket } from "@/lib/market";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("nav");
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

  const invoiceAccessForAll = !isUsMarket() && import.meta.env.VITE_INVOICE_ACCESS_FOR_ALL !== "false";
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
          <p className="text-xs uppercase tracking-wide text-muted-foreground px-2 pt-2">{t("solutions")}</p>
          {isUsMarket() ? (
            <>
              <NavLink to="/irs-notices">{t("sol_irsNotices")}</NavLink>
              <NavLink to="/state-tax-letters">{t("sol_stateTax")}</NavLink>
              <NavLink to="/ssa-letters">{t("sol_ssa")}</NavLink>
              <NavLink to="/govletter-vs-chatgpt">{t("sol_vsChatgpt")}</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/nav-hatarozat-ertelmezes">{t("sol_navDecision")}</NavLink>
              <NavLink to="/szamla-ocr">{t("sol_invoiceOcr")}</NavLink>
              <NavLink to="/dokumentum-archivum">{t("sol_docArchive")}</NavLink>
              <NavLink to="/govletter-vs-chatgpt">{t("sol_vsChatgpt")}</NavLink>
              <NavLink to="/govletter-vs-billingo">{t("sol_vsBillingo")}</NavLink>
              <NavLink to="/govletter-vs-szamlazz">{t("sol_vsSzamlazz")}</NavLink>
            </>
          )}
        </>
      );
    }

    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="text-sm font-medium min-h-[44px] px-2">
            <Layers className="h-4 w-4 mr-1" />
            {t("solutions")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {isUsMarket() ? (
            <>
              <DropdownMenuItem onClick={() => navigate("/irs-notices")}>{t("sol_irsNotices")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/govletter-vs-chatgpt")}>{t("sol_vsChatgpt")}</DropdownMenuItem>
            </>
          ) : (
            <>
              <DropdownMenuItem onClick={() => navigate("/nav-hatarozat-ertelmezes")}>{t("sol_navDecision")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/szamla-ocr")}>{t("sol_invoiceOcr")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dokumentum-archivum")}>{t("sol_docArchive")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/govletter-vs-chatgpt")}>{t("sol_vsChatgpt")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/govletter-vs-billingo")}>{t("sol_vsBillingo")}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/govletter-vs-szamlazz")}>{t("sol_vsSzamlazz")}</DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const DesktopPublicLinks = () => (
    <>
      <SolutionsDropdown />
      <Link to={isUsMarket() ? "/pricing" : "/arak"} data-tour="nav-pricing" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        {t("pricing")}
      </Link>
      <Link to="/blog" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        Blog
      </Link>
      <Link to={isUsMarket() ? "/help" : "/gyik"} className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        {isUsMarket() ? t("helpFaq") : t("faq")}
      </Link>
    </>
  );

  const DesktopAppLinks = () => (
    <>
      <Link to="/" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        Dashboard
      </Link>
      <Link to="/upload" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        {t("upload")}
      </Link>
      <Link to="/archive" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        {t("archive")}
      </Link>
      <Link to="/search" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2">
        {t("search")}
      </Link>
      {!isUsMarket() && (hasInvoiceAccess || isAdmin) && (
        <Link to="/invoices" className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2 gap-1">
          <Receipt className="h-4 w-4" />
          {t("accounting")}
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
            <DropdownMenuItem onClick={() => navigate("/admin")}>Dashboard</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/blog")}>Blog / Articles</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/users")}>Users</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/analytics")}>{t("analytics")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/forms")}>{t("formsAdmin")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/admin/knowledge-base")}>{t("knowledgeBase")}</DropdownMenuItem>
            {isOwner && <DropdownMenuItem onClick={() => navigate("/admin/ai-studio")}>{t("aiStudio")}</DropdownMenuItem>}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );

  const mobileNavLinks = (
    <>
      {!user ? (
        <>
          <NavLink to="/">{t("home")}</NavLink>
          <NavLink to={isUsMarket() ? "/pricing" : "/arak"}>{t("pricing")}</NavLink>
          <NavLink to="/blog">{t("blog")}</NavLink>
          <NavLink to={isUsMarket() ? "/help" : "/gyik"}>{isUsMarket() ? t("helpFaq") : t("faq")}</NavLink>
          {!isUsMarket() && <NavLink to="/help">{t("help")}</NavLink>}
          <SolutionsDropdown mobile />
        </>
      ) : (
        <>
          <NavLink to="/">{t("dashboard")}</NavLink>
          <NavLink to="/upload">{t("upload")}</NavLink>
          <NavLink to="/archive">{t("archive")}</NavLink>
          <NavLink to="/search">{t("search")}</NavLink>
          {!isUsMarket() && (hasInvoiceAccess || isAdmin) && <NavLink to="/invoices">{t("accounting")}</NavLink>}
          <NavLink to="/settings">{t("settings")}</NavLink>
          <NavLink to="/blog">{t("blog")}</NavLink>
          <NavLink to={isUsMarket() ? "/help" : "/gyik"}>{isUsMarket() ? t("helpFaq") : t("faq")}</NavLink>
          {!isUsMarket() && <NavLink to="/help">{t("help")}</NavLink>}
          {!checkingAdmin && isAdmin && (
            <>
              <p className="text-xs uppercase tracking-wide text-muted-foreground px-2 pt-2">{t("admin")}</p>
              <NavLink to="/admin">Dashboard</NavLink>
              <NavLink to="/admin/blog">Blog / Articles</NavLink>
              <NavLink to="/admin/users">Users</NavLink>
              <NavLink to="/admin/analytics">{t("analytics")}</NavLink>
              <NavLink to="/admin/forms">{t("formsAdmin")}</NavLink>
              <NavLink to="/admin/knowledge-base">{t("knowledgeBase")}</NavLink>
              {isOwner && <NavLink to="/admin/ai-studio">{t("aiStudio")}</NavLink>}
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
            <span>{t("brand")}</span>
          </Link>

          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            {user ? <DesktopAppLinks /> : <DesktopPublicLinks />}

            <LanguageSwitcher />

            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="min-h-[44px] min-w-[44px] touch-manipulation"
                aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
              >
                {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-h-[44px] touch-manipulation" data-tour="nav-profile">
                    <User className="h-4 w-4" />
                    <span>{t("profile")}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/upload")}>{t("uploadDoc")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>{t("settings")}</DropdownMenuItem>
                  {isUsMarket() ? (
                    <DropdownMenuItem onClick={() => navigate("/help")}>
                      <HelpCircle className="h-4 w-4 mr-2" />
                      {t("helpFaq")}
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => navigate("/gyik")}>{t("faq")}</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/help")}>
                        <HelpCircle className="h-4 w-4 mr-2" />
                        {t("helpCoach")}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/auth")} size="sm" className="min-h-[44px] touch-manipulation">
                {t("login")}
              </Button>
            )}
          </div>

          <div className="flex md:hidden items-center gap-2">
            <LanguageSwitcher className="h-9 w-[100px]" />
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="min-h-[44px] min-w-[44px] p-2 touch-manipulation"
                aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
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
                  <DropdownMenuItem onClick={() => navigate("/upload")}>{t("uploadDoc")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>{t("settings")}</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate(isUsMarket() ? "/help" : "/gyik")}>
                    {isUsMarket() ? t("helpFaq") : t("helpCoach")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => navigate("/auth")} size="sm" className="min-h-[44px] px-3 touch-manipulation text-xs sm:text-sm">
                {t("loginShort")}
              </Button>
            )}

            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="min-h-[44px] min-w-[44px] p-2 touch-manipulation">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">{t("openMenu")}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="text-left">{t("menu")}</SheetTitle>
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

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { FileText, LogOut, User, HelpCircle, Menu, Moon, Sun } from "lucide-react";
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
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

export function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
        const { data, error } = await supabase.rpc('is_admin');

        if (error) {
          console.error('Error checking admin role:', error);
          setIsAdmin(false);
        } else {
          setIsAdmin(data === true);
        }
      } catch (error) {
        console.error('Error checking admin role:', error);
        setIsAdmin(false);
      } finally {
        setCheckingAdmin(false);
      }
    }

    checkAdminRole();
  }, [user]);

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

  const navLinks = (
    <>
      <Link 
        to="/" 
        className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2"
      >
        Főoldal
      </Link>
      <Link 
        to="/pricing" 
        className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2"
      >
        Árak
      </Link>
      {user && (
        <Link 
          to="/archive" 
          className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2"
        >
          Archívum
        </Link>
      )}
      {user && (
        <Link 
          to="/search" 
          className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2"
        >
          Keresés
        </Link>
      )}
      <Link 
        to="/help" 
        className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2"
      >
        Segítség
      </Link>
      {user && !checkingAdmin && isAdmin && (
        <>
          <Link 
            to="/admin/forms" 
            className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2"
          >
            Űrlapkezelő
          </Link>
          <Link 
            to="/admin/analytics" 
            className="text-sm font-medium text-foreground hover:text-primary transition-colors min-h-[44px] flex items-center touch-manipulation px-2"
          >
            Analitika
          </Link>
        </>
      )}
    </>
  );

  const mobileNavLinks = (
    <>
      <NavLink to="/">Főoldal</NavLink>
      <NavLink to="/pricing">Árak</NavLink>
      {user && <NavLink to="/archive">Archívum</NavLink>}
      {user && <NavLink to="/search">Keresés</NavLink>}
      <NavLink to="/help">Segítség</NavLink>
      {user && !checkingAdmin && isAdmin && (
        <>
          <NavLink to="/admin/forms">Űrlapkezelő</NavLink>
          <NavLink to="/admin/analytics">Analitika</NavLink>
          <NavLink to="/admin/knowledge-base">Knowledge Base</NavLink>
        </>
      )}
    </>
  );

  return (
    <nav className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center gap-2 font-bold text-lg sm:text-xl text-primary touch-manipulation min-h-[44px]"
          >
            <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
            <span>AdminAI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-4 lg:gap-6">
            {navLinks}
            {/* Dark Mode Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="min-h-[44px] min-w-[44px] touch-manipulation"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </Button>
            )}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-h-[44px] touch-manipulation">
                    <User className="h-4 w-4" />
                    <span>Profil</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/upload")}>
                    Dokumentum feltöltése
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    Beállítások
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Kijelentkezés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => navigate("/auth")} 
                size="sm"
                className="min-h-[44px] touch-manipulation"
              >
                Bejelentkezés
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-2">
            {/* Dark Mode Toggle */}
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="min-h-[44px] min-w-[44px] p-2 touch-manipulation"
                aria-label="Toggle theme"
              >
                {theme === "dark" ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
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
                  <DropdownMenuItem onClick={() => navigate("/upload")}>
                    Dokumentum feltöltése
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    Beállítások
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={signOut} className="text-destructive">
                    <LogOut className="h-4 w-4 mr-2" />
                    Kijelentkezés
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                onClick={() => navigate("/auth")} 
                size="sm"
                className="min-h-[44px] px-3 touch-manipulation text-xs sm:text-sm"
              >
                Bejelentkezés
              </Button>
            )}
            
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="min-h-[44px] min-w-[44px] p-2 touch-manipulation"
                >
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Menü megnyitása</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[320px]">
                <SheetHeader>
                  <SheetTitle className="text-left">Menü</SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-1 mt-6">
                  {mobileNavLinks}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}

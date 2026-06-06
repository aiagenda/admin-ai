import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Smartphone, Download } from "lucide-react";

const DISMISS_KEY = "pwa-install-dismissed";
const DISMISS_DAYS = 7;
const VISITS_KEY = "pwa-visits";
const MIN_VISITS = 3; // don't pester first-time users; show once they're engaged

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);
    if (standalone) return;

    const dismissed = localStorage.getItem(DISMISS_KEY);
    if (dismissed) {
      const until = Number(dismissed);
      if (until > Date.now()) return;
    }

    const mobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
      (typeof window !== "undefined" && window.innerWidth < 768);
    if (!mobile) return;

    // Only prompt once the user is engaged (>= MIN_VISITS app loads).
    const visits = Number(localStorage.getItem(VISITS_KEY) || "0") + 1;
    localStorage.setItem(VISITS_KEY, String(visits));
    if (visits < MIN_VISITS) return;

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    const timer = setTimeout(() => setVisible(true), 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      clearTimeout(timer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setVisible(false);
      setDeferredPrompt(null);
    } else {
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000));
  };

  if (!visible || isStandalone) return null;

  return (
    <div className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom))] md:bottom-0 left-0 right-0 z-50 p-3 md:pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
      <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border bg-card shadow-lg p-4 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Smartphone className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-sm">Better on mobile</p>
          <p className="text-xs text-muted-foreground">
            {isIOS
              ? "Safari: Share → Add to Home Screen"
              : "Install the app on your home screen"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {!isIOS && (
            <Button size="sm" onClick={handleInstall} className="gap-1.5">
              <Download className="h-4 w-4" />
              Install
            </Button>
          )}
          {isIOS && (
            <Button size="sm" onClick={() => setVisible(false)}>
              Got it
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleDismiss}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, ArrowRight, Upload, Receipt, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Confetti from "react-confetti";
import { isUsMarket } from "@/lib/market";
import posthog from "posthog-js";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [showConfetti, setShowConfetti] = useState(true);
  const us = isUsMarket();

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user) {
      posthog.capture("subscription activated", {
        stripe_session_id: sessionId,
        market: us ? "us" : "hu",
      });
    }
  }, [user, sessionId, us]);

  if (!user) {
    navigate("/auth");
    return null;
  }

  return (
    <div className="min-h-screen py-12 px-4 relative">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={200}
          colors={["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b"]}
        />
      )}

      <div className="container mx-auto max-w-2xl">
        <Card className="border-2 border-green-200 dark:border-green-900 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl sm:text-3xl text-green-700 dark:text-green-400">
              {us ? "You're all set!" : "Sikeres előfizetés!"}
            </CardTitle>
            <CardDescription className="text-base">
              {us
                ? "Thanks for choosing GovLetter. Your plan is now active."
                : "Köszönjük, hogy a GovLettert választottad!"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-green-800 dark:text-green-300 text-center text-sm">
                {us
                  ? "Your subscription is active. All features are now unlocked."
                  : "Az előfizetésed most aktív! Minden prémium funkció elérhető számodra."}
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {us ? "What to do next" : "Következő lépések"}
              </h3>

              <div
                className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => navigate("/upload")}
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Upload className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {us ? "Upload your first document" : "Töltsd fel az első dokumentumod"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {us
                      ? "PDF or photo — analysis in under 60 seconds"
                      : "PDF vagy fotó – 60 másodperc alatt elemzés"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto mt-1 shrink-0" />
              </div>

              <div
                className="flex items-start gap-3 p-3 rounded-lg border hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => navigate("/archive")}
              >
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Receipt className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {us ? "View your document archive" : "Dokumentumarchívum megtekintése"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {us
                      ? "All your uploaded letters and analyses"
                      : "Minden feltöltött levél és elemzés"}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground ml-auto mt-1 shrink-0" />
              </div>
            </div>

            {us ? (
              <p className="text-xs text-center text-muted-foreground">
                Questions? Email us at{" "}
                <a href="mailto:support@govletter.com" className="text-primary hover:underline">
                  support@govletter.com
                </a>
              </p>
            ) : (
              <p className="text-xs text-center text-muted-foreground">
                Kérdésed van? Írj nekünk:{" "}
                <a href="mailto:support@govletter.com" className="text-primary hover:underline">
                  support@govletter.com
                </a>
              </p>
            )}

            {sessionId && (
              <p className="text-xs text-center text-muted-foreground/60">
                {us ? "Order reference:" : "Rendelési azonosító:"} {sessionId.slice(0, 20)}…
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

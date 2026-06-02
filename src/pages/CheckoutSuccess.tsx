import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Loader2, ArrowRight, Upload, Receipt, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Confetti from "react-confetti";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Hide confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, []);

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
              Sikeres előfizetés!
            </CardTitle>
            <CardDescription className="text-base">
              Köszönjük, hogy az GovLetter-t választottad!
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950/30 p-4 rounded-lg border border-green-200 dark:border-green-900">
              <p className="text-green-800 dark:text-green-300 text-center">
                Az előfizetésed most aktív! Minden prémium funkció elérhető számodra.
              </p>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Mit tudsz most csinálni?</h3>
              
              <div className="grid gap-3">
                <button 
                  onClick={() => navigate("/upload")}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Dokumentum feltöltése</p>
                    <p className="text-sm text-muted-foreground">Elemeztesd a hivatalos leveleidet</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => navigate("/invoices/upload")}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Számla feltöltése</p>
                    <p className="text-sm text-muted-foreground">Használd a könyvelési modult</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>

                <button 
                  onClick={() => navigate("/settings")}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Calendar className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">Értesítések beállítása</p>
                    <p className="text-sm text-muted-foreground">Ne maradj le a határidőkről</p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Button 
                onClick={() => navigate("/")} 
                className="w-full"
                size="lg"
              >
                Irány a főoldal
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Előfizetésedet bármikor kezelheted a Beállítások menüben.
              <br />
              Kérdésed van? Írj nekünk: support@govletter.com
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

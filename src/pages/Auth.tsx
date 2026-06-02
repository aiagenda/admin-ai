import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageSEO } from "@/components/PageSEO";
import { useTranslation } from "react-i18next";
import posthog from "posthog-js";

export default function Auth() {
  const { t } = useTranslation("common");
  const { t: navT } = useTranslation("nav");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const { signIn, signUp, user, session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (user && session && !bootstrapping) {
        setBootstrapping(true);
        try {
          const { data, error } = await supabase.rpc("bootstrap_admin");

          if (error) {
            console.error("Bootstrap admin error:", error);
            toast.error(t("authPage.toastAdminFailed"));
          } else {
            navigate("/");
          }
        } catch (err) {
          console.error("Bootstrap error:", err);
          toast.error(t("authPage.toastAuthError"));
        } finally {
          setBootstrapping(false);
        }
      }
    };

    handleAuthCallback();
  }, [user, session, navigate, bootstrapping, t]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${import.meta.env.VITE_APP_ORIGIN || window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        posthog.captureException(error);
        toast.error(t("authPage.toastGoogleFailed"));
        console.error("Google OAuth error:", error);
      } else {
        posthog.capture("user signed in", { method: "google" });
      }
    } catch (err) {
      posthog.captureException(err instanceof Error ? err : new Error(String(err)));
      toast.error(t("authPage.toastAuthError"));
      console.error("OAuth error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast.error(t("authPage.toastSignInFailed"));
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    if (password.length < 6) {
      toast.error(t("authPage.toastPasswordMin"));
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    if (error) {
      toast.error(t("authPage.toastSignUpFailed"));
    }
    setLoading(false);
  };

  if (bootstrapping) {
    return (
      <>
        <PageSEO pageKey="authBootstrap" path="/auth" noindex />
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
            <p className="text-muted-foreground">{t("authPage.checkingAccess")}</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <PageSEO pageKey="auth" path="/auth" noindex />
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{navT("brand")}</CardTitle>
          <CardDescription>{t("authPage.tagline")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full min-h-[48px] touch-manipulation"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              {loading ? t("authPage.loading") : t("authPage.googleSignIn")}
            </Button>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 h-12">
                <TabsTrigger value="signin" className="min-h-[44px]">
                  {t("authPage.tabSignIn")}
                </TabsTrigger>
                <TabsTrigger value="signup" className="min-h-[44px]">
                  {t("authPage.tabSignUp")}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">{t("authPage.email")}</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={t("authPage.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">{t("authPage.password")}</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t("authPage.loading") : t("authPage.signIn")}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">{t("authPage.email")}</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={t("authPage.emailPlaceholder")}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">{t("authPage.password")}</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <p className="text-xs text-muted-foreground">{t("authPage.passwordHint")}</p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t("authPage.loading") : t("authPage.signUp")}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

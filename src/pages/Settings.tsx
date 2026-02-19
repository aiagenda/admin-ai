import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Mail, Save, Loader2, Bell, LayoutGrid } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";
import { usePushNotification } from "@/hooks/use-push-notification";
import { getHomeCardOrder, setHomeCardOrder, type HomeCardId } from "@/lib/home-cards";
import { SortableHomeCardList } from "@/components/SortableHomeCardList";

interface UserProfile {
  id: string;
  user_id: string;
  accountant_email: string | null;
  accountant_auto_send_enabled: boolean;
  accountant_auto_send_day: number | null;
  accountant_export_format: "csv" | "excel";
  created_at: string;
  updated_at: string;
}

export default function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [accountantEmail, setAccountantEmail] = useState("");
  const [autoSendEnabled, setAutoSendEnabled] = useState(false);
  const [autoSendDay, setAutoSendDay] = useState<string>("1");
  const [exportFormat, setExportFormat] = useState<"csv" | "excel">("csv");

  // Notification preferences state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [email7Days, setEmail7Days] = useState(true);
  const [email3Days, setEmail3Days] = useState(true);
  const [email1Day, setEmail1Day] = useState(true);
  const [emailOnDeadline, setEmailOnDeadline] = useState(false);
  
  const [pushEnabled, setPushEnabled] = useState(false);
  const [push7Days, setPush7Days] = useState(false);
  const [push3Days, setPush3Days] = useState(false);
  const [push1Day, setPush1Day] = useState(true);
  const [pushOnDeadline, setPushOnDeadline] = useState(false);

  // Push notification hook
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, isLoading: pushLoading, subscribe: subscribePush, unsubscribe: unsubscribePush } = usePushNotification();

  const [homeCardOrder, setHomeCardOrderState] = useState<HomeCardId[]>(() => getHomeCardOrder());

  const handleCardOrderChange = (newOrder: HomeCardId[]) => {
    setHomeCardOrder(newOrder);
    setHomeCardOrderState(newOrder);
  };

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        // Try to get or create profile using the function
        const { data, error } = await supabase.rpc("get_user_profile", {
          _user_id: user.id,
        });

        if (error) {
          // If function doesn't exist yet, try direct query
          const { data: directData, error: directError } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (directError) {
            // Profile doesn't exist, create default one
            const { data: newProfile, error: createError } = await supabase
              .from("user_profiles")
              .insert({
                user_id: user.id,
                accountant_export_format: "csv",
              })
              .select()
              .single();

            if (createError) {
              console.error("Error creating profile:", createError);
              toast.error("Hiba a profil létrehozása során");
              return;
            }

            setProfile(newProfile);
            setAccountantEmail(newProfile.accountant_email || "");
            setAutoSendEnabled(newProfile.accountant_auto_send_enabled || false);
            setAutoSendDay(String(newProfile.accountant_auto_send_day || 1));
            setExportFormat(newProfile.accountant_export_format || "csv");
          } else {
            setProfile(directData);
            setAccountantEmail(directData.accountant_email || "");
            setAutoSendEnabled(directData.accountant_auto_send_enabled || false);
            setAutoSendDay(String(directData.accountant_auto_send_day || 1));
            setExportFormat(directData.accountant_export_format || "csv");
          }
        } else {
          // Function returned data (it's an array from the function)
          const profileData = Array.isArray(data) ? data[0] : data;
          setProfile(profileData);
          setAccountantEmail(profileData?.accountant_email || "");
          setAutoSendEnabled(profileData?.accountant_auto_send_enabled || false);
          setAutoSendDay(String(profileData?.accountant_auto_send_day || 1));
          setExportFormat(profileData?.accountant_export_format || "csv");
        }

        // Fetch notification preferences
        const { data: notifData, error: notifError } = await supabase.rpc("get_notification_preferences", {
          _user_id: user.id,
        });

        if (!notifError && notifData) {
          const prefs = Array.isArray(notifData) ? notifData[0] : notifData;
          if (prefs) {
            setEmailEnabled(prefs.email_enabled ?? true);
            setEmail7Days(prefs.email_7_days_before ?? true);
            setEmail3Days(prefs.email_3_days_before ?? true);
            setEmail1Day(prefs.email_1_day_before ?? true);
            setEmailOnDeadline(prefs.email_on_deadline ?? false);
            
            setPushEnabled(prefs.push_enabled ?? false);
            setPush7Days(prefs.push_7_days_before ?? false);
            setPush3Days(prefs.push_3_days_before ?? false);
            setPush1Day(prefs.push_1_day_before ?? true);
            setPushOnDeadline(prefs.push_on_deadline ?? false);
          }
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        toast.error("Hiba a profil betöltése során");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      // Save accountant settings
      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          accountant_email: accountantEmail.trim() || null,
          accountant_auto_send_enabled: autoSendEnabled,
          accountant_auto_send_day: autoSendEnabled ? parseInt(autoSendDay) : null,
          accountant_export_format: exportFormat,
        })
        .eq("user_id", user.id);

      if (profileError) throw profileError;

      // Save notification preferences
      const { error: notifError } = await supabase
        .from("notification_preferences")
        .upsert({
          user_id: user.id,
          email_enabled: emailEnabled,
          email_7_days_before: email7Days,
          email_3_days_before: email3Days,
          email_1_day_before: email1Day,
          email_on_deadline: emailOnDeadline,
          push_enabled: pushEnabled,
          push_7_days_before: push7Days,
          push_3_days_before: push3Days,
          push_1_day_before: push1Day,
          push_on_deadline: pushOnDeadline,
        }, {
          onConflict: "user_id",
        });

      if (notifError) throw notifError;

      toast.success("Beállítások mentve!");
      
      // Update local profile state
      setProfile({
        ...profile,
        accountant_email: accountantEmail.trim() || null,
        accountant_auto_send_enabled: autoSendEnabled,
        accountant_auto_send_day: autoSendEnabled ? parseInt(autoSendDay) : null,
        accountant_export_format: exportFormat,
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error("Hiba a beállítások mentése során");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!accountantEmail || !accountantEmail.trim()) {
      toast.error("Először adj meg egy könyvelő email címet");
      return;
    }

    setSendingTest(true);
    try {
      const fnBase =
        import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      const fnURL = `${fnBase}/send-accountant-report`;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Nincs bejelentkezve");
      }

      const response = await fetch(fnURL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          test: true,
          email: accountantEmail.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Hiba a teszt email küldése során");
      }

      toast.success(`Teszt email elküldve a következő címre: ${accountantEmail}`);
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast.error(error.message || "Hiba a teszt email küldése során");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Beállítások</h1>
          <p className="text-muted-foreground mt-2">
            Kezelje a könyvelő export beállításait és egyéb preferenciáit
          </p>
        </div>

        {/* Főoldal kártyák sorrendje */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              <CardTitle>Kártyák sorrendje (főoldal)</CardTitle>
            </div>
            <CardDescription>
              Állítsd be, milyen sorrendben jelenjenek meg a blokkok a főoldalon. Különösen mobilon hasznos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SortableHomeCardList order={homeCardOrder} onOrderChange={handleCardOrderChange} />
          </CardContent>
        </Card>

                {/* Könyvelő Export Beállítások */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Könyvelő Export Beállítások</CardTitle>
              <HelpTooltip 
                content="Állítsa be a könyvelő email címét és az automatikus havi jelentés küldés beállításait. A jelentések tartalmazni fogják az adott hónap dokumentumait."
                helpPageAnchor="beallitasok"
              />
            </div>
            <CardDescription>
              Konfigurálja az automatikus könyvelő jelentések küldését
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Könyvelő Email */}
            <div className="space-y-2">
              <Label htmlFor="accountant-email">Könyvelő email címe</Label>
              <div className="flex gap-2">
                <Input
                  id="accountant-email"
                  type="email"
                  placeholder="konyvelo@example.com"
                  value={accountantEmail}
                  onChange={(e) => setAccountantEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSendTestEmail}
                  disabled={!accountantEmail || sendingTest}
                  title="Teszt email küldése"
                >
                  {sendingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                A könyvelő email címe, ahova a havi jelentéseket küldjük
              </p>
            </div>

            <Separator />

            {/* Automatikus Küldés */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-send">Automatikus havi jelentés küldés</Label>
                  <p className="text-sm text-muted-foreground">
                    Minden hónapban automatikusan küldjön jelentést a könyvelőnek
                  </p>
                </div>
                <Switch
                  id="auto-send"
                  checked={autoSendEnabled}
                  onCheckedChange={setAutoSendEnabled}
                />
              </div>

              {autoSendEnabled && (
                <div className="space-y-2 pl-6 border-l-2">
                  <Label htmlFor="auto-send-day">Küldés napja a hónapban</Label>
                  <Select value={autoSendDay} onValueChange={setAutoSendDay}>
                    <SelectTrigger id="auto-send-day">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={String(day)}>
                          {day}. nap
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    A jelentés ezen a napon lesz elküldve minden hónapban
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Export Formátum */}
            <div className="space-y-2">
              <Label htmlFor="export-format">Export formátum</Label>
              <Select value={exportFormat} onValueChange={(value: "csv" | "excel") => setExportFormat(value)}>
                <SelectTrigger id="export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (könyvelő programokkal kompatibilis)</SelectItem>
                  <SelectItem value="excel">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                A jelentések ebben a formátumban lesznek generálva
              </p>
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mentés...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Beállítások mentése
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Értesítési Beállítások */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Határidő Emlékeztetők</CardTitle>
              <HelpTooltip 
                content="Állítsa be, hogy mikor és milyen módon szeretne emlékeztetőket kapni a közelgő határidőkről."
                helpPageAnchor="beallitasok"
              />
            </div>
            <CardDescription>
              Email és Push értesítések beállítása a határidők előtt
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email Értesítések */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <Label htmlFor="email-enabled">Email értesítések</Label>
                </div>
                <Switch
                  id="email-enabled"
                  checked={emailEnabled}
                  onCheckedChange={setEmailEnabled}
                />
              </div>

              {emailEnabled && (
                <div className="space-y-3 pl-6 border-l-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-7-days">7 nappal a határidő előtt</Label>
                    <Switch
                      id="email-7-days"
                      checked={email7Days}
                      onCheckedChange={setEmail7Days}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-3-days">3 nappal a határidő előtt</Label>
                    <Switch
                      id="email-3-days"
                      checked={email3Days}
                      onCheckedChange={setEmail3Days}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-1-day">1 nappal a határidő előtt</Label>
                    <Switch
                      id="email-1-day"
                      checked={email1Day}
                      onCheckedChange={setEmail1Day}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-on-deadline">A határidő napján</Label>
                    <Switch
                      id="email-on-deadline"
                      checked={emailOnDeadline}
                      onCheckedChange={setEmailOnDeadline}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Push Értesítések */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <Label htmlFor="push-enabled">Push értesítések</Label>
                </div>
                <Switch
                  id="push-enabled"
                  checked={pushEnabled && pushSubscribed}
                  onCheckedChange={async (checked) => {
                    if (checked) {
                      const success = await subscribePush();
                      if (success) {
                        setPushEnabled(true);
                      }
                    } else {
                      const success = await unsubscribePush();
                      if (success) {
                        setPushEnabled(false);
                      }
                    }
                  }}
                  disabled={!pushSupported || pushLoading}
                />
              </div>

              {!pushSupported && (
                <p className="text-sm text-muted-foreground">
                  A böngésző nem támogatja a push értesítéseket
                </p>
              )}

              {pushEnabled && pushSubscribed && (
                <div className="space-y-3 pl-6 border-l-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-7-days">7 nappal a határidő előtt</Label>
                    <Switch
                      id="push-7-days"
                      checked={push7Days}
                      onCheckedChange={setPush7Days}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-3-days">3 nappal a határidő előtt</Label>
                    <Switch
                      id="push-3-days"
                      checked={push3Days}
                      onCheckedChange={setPush3Days}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-1-day">1 nappal a határidő előtt</Label>
                    <Switch
                      id="push-1-day"
                      checked={push1Day}
                      onCheckedChange={setPush1Day}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-on-deadline">A határidő napján</Label>
                    <Switch
                      id="push-on-deadline"
                      checked={pushOnDeadline}
                      onCheckedChange={setPushOnDeadline}
                    />
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mentés...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Beállítások mentése
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Információ */}
        <Card>
          <CardHeader>
            <CardTitle>Információ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • A havi jelentések tartalmazni fogják az adott hónapban feltöltött és elemzett dokumentumokat.
            </p>
            <p>
              • A jelentések CSV vagy Excel formátumban lesznek generálva, a beállított formátum szerint.
            </p>
            <p>
              • Az automatikus küldés csak akkor működik, ha meg van adva a könyvelő email címe.
            </p>
            <p>
              • A teszt email küldésével ellenőrizheti, hogy a beállított email cím elérhető-e.
            </p>
            <p>
              • Az email értesítések automatikusan működnek, ha engedélyezve vannak.
            </p>
            <p>
              • A Push értesítések csak akkor működnek, ha a böngésző támogatja és engedélyezted őket.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

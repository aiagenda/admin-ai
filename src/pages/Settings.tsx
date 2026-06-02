import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Mail, Save, Loader2, Bell, LayoutGrid, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { HelpTooltip } from "@/components/HelpTooltip";
import { usePushNotification } from "@/hooks/use-push-notification";
import { getHomeCardOrder, setHomeCardOrder, type HomeCardId } from "@/lib/home-cards";
import { SortableHomeCardList } from "@/components/SortableHomeCardList";

const SendIcon = typeof Send !== "undefined" ? Send : Mail;

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
        // Load user_profiles directly (no RPC – avoids 400)
        const { data: directData, error: directError } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();

        if (directError) {
          const { data: newProfile, error: createError } = await supabase
            .from("user_profiles")
            .insert({ user_id: user.id, accountant_export_format: "csv" })
            .select()
            .single();
          if (createError) {
            console.error("Error creating profile:", createError);
            toast.error("Failed to create profile");
            setLoading(false);
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

        // Load notification_preferences directly (no RPC – avoids 400)
        const { data: notifRow, error: notifError } = await supabase
          .from("notification_preferences")
          .select("*")
          .eq("user_id", user.id)
          .single();
        if (!notifError && notifRow) {
          setEmailEnabled(notifRow.email_enabled ?? true);
          setEmail7Days(notifRow.email_7_days_before ?? true);
          setEmail3Days(notifRow.email_3_days_before ?? true);
          setEmail1Day(notifRow.email_1_day_before ?? true);
          setEmailOnDeadline(notifRow.email_on_deadline ?? false);
          setPushEnabled(notifRow.push_enabled ?? false);
          setPush7Days(notifRow.push_7_days_before ?? false);
          setPush3Days(notifRow.push_3_days_before ?? false);
          setPush1Day(notifRow.push_1_day_before ?? true);
          setPushOnDeadline(notifRow.push_on_deadline ?? false);
        }
      } catch (error: any) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
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

      toast.success("Settings saved!");
      
      // Update local profile state
      setProfile({
        ...profile,
        accountant_email: accountantEmail.trim() || null,
        accountant_auto_send_enabled: autoSendEnabled,
        accountant_auto_send_day: autoSendEnabled ? parseInt(autoSendDay) : null,
        accountant_export_format: exportFormat,
      });
    } catch (error: any) {
      console.error("Error saving settings:", error?.message ?? error);
      if (error?.code) console.error("Supabase code:", error.code, "details:", error.details);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!accountantEmail || !accountantEmail.trim()) {
      toast.error("Enter an accountant email first");
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
        throw new Error(result?.error || "Failed to send test email");
      }

      toast.success(`Test email sent to ${accountantEmail}`);
    } catch (error: any) {
      console.error("Error sending test email:", error);
      toast.error(error.message || "Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage export, notifications, and home screen layout
          </p>
        </div>

        {/* Home card order */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              <CardTitle>Home screen card order</CardTitle>
            </div>
            <CardDescription>
              Drag to reorder blocks on your dashboard. Especially useful on mobile.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SortableHomeCardList order={homeCardOrder} onOrderChange={handleCardOrderChange} />
          </CardContent>
        </Card>

                {/* Accountant export */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Accountant Export</CardTitle>
              <HelpTooltip 
                content="Set your accountant email and optional monthly report delivery."
                helpPageAnchor="settings"
              />
            </div>
            <CardDescription>
              Configure automatic monthly report delivery
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Accountant email */}
            <div className="space-y-2">
              <Label htmlFor="accountant-email">Accountant email</Label>
              <div className="flex gap-2">
                <Input
                  id="accountant-email"
                  type="email"
                  placeholder="accountant@example.com"
                  value={accountantEmail}
                  onChange={(e) => setAccountantEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleSendTestEmail}
                  disabled={!accountantEmail || sendingTest}
                  title="Send test email"
                >
                  {sendingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <SendIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Email address where monthly reports are sent
              </p>
            </div>

            <Separator />

            {/* Auto-send */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-send">Send monthly report automatically</Label>
                  <p className="text-sm text-muted-foreground">
                    Email a report to your accountant each month
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
                  <Label htmlFor="auto-send-day">Day of month to send</Label>
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
                    The report is sent on this day each month
                  </p>
                </div>
              )}
            </div>

            <Separator />

            {/* Export format */}
            <div className="space-y-2">
              <Label htmlFor="export-format">Export format</Label>
              <Select value={exportFormat} onValueChange={(value: "csv" | "excel") => setExportFormat(value)}>
                <SelectTrigger id="export-format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (compatible with most tools)</SelectItem>
                  <SelectItem value="excel">Excel (XLSX)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Reports are generated in this format
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Deadline Reminders</CardTitle>
              <HelpTooltip 
                content="Choose when to receive email and push reminders before deadlines."
                helpPageAnchor="settings"
              />
            </div>
            <CardDescription>
              Email and push notifications before deadlines
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Email notifications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  <Label htmlFor="email-enabled">Email notifications</Label>
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
                    <Label htmlFor="email-7-days">7 days before deadline</Label>
                    <Switch
                      id="email-7-days"
                      checked={email7Days}
                      onCheckedChange={setEmail7Days}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-3-days">3 days before deadline</Label>
                    <Switch
                      id="email-3-days"
                      checked={email3Days}
                      onCheckedChange={setEmail3Days}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-1-day">1 day before deadline</Label>
                    <Switch
                      id="email-1-day"
                      checked={email1Day}
                      onCheckedChange={setEmail1Day}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-on-deadline">On the deadline date</Label>
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

            {/* Push notifications */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <Label htmlFor="push-enabled">Push notifications</Label>
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
                  Your browser does not support push notifications
                </p>
              )}

              {pushEnabled && pushSubscribed && (
                <div className="space-y-3 pl-6 border-l-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-7-days">7 days before deadline</Label>
                    <Switch
                      id="push-7-days"
                      checked={push7Days}
                      onCheckedChange={setPush7Days}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-3-days">3 days before deadline</Label>
                    <Switch
                      id="push-3-days"
                      checked={push3Days}
                      onCheckedChange={setPush3Days}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-1-day">1 day before deadline</Label>
                    <Switch
                      id="push-1-day"
                      checked={push1Day}
                      onCheckedChange={setPush1Day}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-on-deadline">On the deadline date</Label>
                    <Switch
                      id="push-on-deadline"
                      checked={pushOnDeadline}
                      onCheckedChange={setPushOnDeadline}
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Monthly reports include documents uploaded and analyzed that month.
            </p>
            <p>
              • Reports are generated as CSV or Excel based on your selection.
            </p>
            <p>
              • Auto-send requires a valid accountant email address.
            </p>
            <p>
              • Use Send test email to verify the address works.
            </p>
            <p>
              • Email reminders work when enabled above.
            </p>
            <p>
              • Push notifications require browser permission.
            </p>
          </CardContent>
        </Card>

        {/* Save button */}
        <div className="flex justify-end pt-4 pb-6">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save settings
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

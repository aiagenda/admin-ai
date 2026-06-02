import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Server configuration error: missing Supabase credentials");
    }

    if (!resendApiKey) {
      throw new Error("Server configuration error: missing Resend API key");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Calculate reminder dates (7, 3, 1 day before deadline)
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    
    const oneDayFromNow = new Date(today);
    oneDayFromNow.setDate(oneDayFromNow.getDate() + 1);

    const results = [];

    // Process each reminder type
    for (const reminderConfig of [
      { type: "7_days", targetDate: sevenDaysFromNow },
      { type: "3_days", targetDate: threeDaysFromNow },
      { type: "1_day", targetDate: oneDayFromNow },
    ]) {
      try {
        // Find analyses with deadlines matching the target date
        const targetDateStr = reminderConfig.targetDate.toISOString().split("T")[0];
        
        const { data: analyses, error: analysesError } = await supabase
          .from("analyses")
          .select(`
            id,
            document_id,
            deadline,
            severity,
            simple_summary,
            documents!inner (
              id,
              filename,
              user_id,
              users!inner (
                id,
                email
              )
            )
          `)
          .eq("deadline", targetDateStr)
          .not("deadline", "is", null);

        if (analysesError) throw analysesError;

        if (!analyses || analyses.length === 0) {
          console.log(`No deadlines found for ${reminderConfig.type} reminder (${targetDateStr})`);
          continue;
        }

        console.log(`Found ${analyses.length} deadlines for ${reminderConfig.type} reminder`);

        // Process each analysis
        for (const analysis of analyses) {
          const document = analysis.documents;
          const user = document.users;
          
          if (!user || !user.email) {
            console.warn(`Skipping analysis ${analysis.id}: no user email`);
            continue;
          }

          try {
            // Get user notification preferences
            const { data: prefsData, error: prefsError } = await supabase.rpc("get_notification_preferences", {
              _user_id: user.id,
            });

            let preferences: any = null;
            if (!prefsError && prefsData) {
              preferences = Array.isArray(prefsData) ? prefsData[0] : prefsData;
            }

            // Check if reminder should be sent based on preferences
            const shouldSendEmail = preferences?.email_enabled && (
              (reminderConfig.type === "7_days" && preferences?.email_7_days_before) ||
              (reminderConfig.type === "3_days" && preferences?.email_3_days_before) ||
              (reminderConfig.type === "1_day" && preferences?.email_1_day_before)
            );

            const shouldSendPush = preferences?.push_enabled && (
              (reminderConfig.type === "7_days" && preferences?.push_7_days_before) ||
              (reminderConfig.type === "3_days" && preferences?.push_3_days_before) ||
              (reminderConfig.type === "1_day" && preferences?.push_1_day_before)
            );

            if (!shouldSendEmail && !shouldSendPush) {
              console.log(`Skipping reminder for user ${user.id}: preferences disabled`);
              continue;
            }

            // Get user's push subscriptions if push is enabled
            let pushSubscriptions: any[] = [];
            if (shouldSendPush) {
              const { data: subscriptions, error: subError } = await supabase
                .from("push_subscriptions")
                .select("id, endpoint, p256dh, auth")
                .eq("user_id", user.id);

              if (!subError && subscriptions) {
                pushSubscriptions = subscriptions;
              }
            }

            // Check if reminder already sent
            const { data: existingReminder } = await supabase
              .from("deadline_reminders")
              .select("id, status")
              .eq("analysis_id", analysis.id)
              .eq("reminder_type", reminderConfig.type)
              .single();

            if (existingReminder && existingReminder.status === "sent") {
              console.log(`Reminder already sent for analysis ${analysis.id}, type ${reminderConfig.type}`);
              continue;
            }

            // Format deadline date
            const deadlineDate = new Date(analysis.deadline);
            const deadlineFormatted = deadlineDate.toLocaleDateString("hu-HU", {
              year: "numeric",
              month: "long",
              day: "numeric",
            });

            // Determine severity text
            const severityText: Record<string, string> = {
              urgent: "Sürgős",
              action_needed: "Teendő",
              info: "Információ",
            };

            let emailSent = false;
            let pushSent = false;
            let errorMessage: string | null = null;

            // Send email if enabled
            if (shouldSendEmail) {
              try {
                const emailSubject = `⏰ Határidő emlékeztető - ${deadlineFormatted}`;
                const emailHtml = `
                  <h2>Kedves ${user.email}!</h2>
                  <p>Emlékeztetünk, hogy <strong>${deadlineFormatted}</strong> határidővel rendelkező dokumentuma van.</p>
                  
                  <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0 0 8px 0;"><strong>Dokumentum:</strong> ${document.filename}</p>
                    <p style="margin: 0 0 8px 0;"><strong>Sürgősség:</strong> ${severityText[analysis.severity] || analysis.severity}</p>
                    <p style="margin: 0;"><strong>Határidő:</strong> ${deadlineFormatted}</p>
                  </div>

                  ${analysis.simple_summary ? `
                    <div style="margin: 20px 0;">
                      <h3>Összefoglaló:</h3>
                      <p>${analysis.simple_summary.substring(0, 200)}${analysis.simple_summary.length > 200 ? "..." : ""}</p>
                    </div>
                  ` : ""}

                  <p style="margin-top: 20px;">
                    <a href="${Deno.env.get("APP_URL") || "https://govletter.com"}/result/${analysis.id}" 
                       style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                      Dokumentum megtekintése
                    </a>
                  </p>

                  <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
                  <p style="color: #666; font-size: 12px;">
                    Ez egy automatikus emlékeztető az GovLetter rendszertől.<br>
                    Az értesítési beállításokat a <a href="${Deno.env.get("APP_URL") || "https://govletter.com"}/settings">Beállítások</a> oldalon módosíthatja.
                  </p>
                `;

                const emailResponse = await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${resendApiKey}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: "GovLetter <noreply@govletter.com>",
                    to: user.email,
                    subject: emailSubject,
                    html: emailHtml,
                  }),
                });

                if (!emailResponse.ok) {
                  const errorText = await emailResponse.text();
                  throw new Error(`Resend API error: ${errorText}`);
                }

                emailSent = true;
                console.log(`✅ Email sent to ${user.email} for deadline ${deadlineFormatted}`);
              } catch (emailError: any) {
                console.error(`Email error for user ${user.id}:`, emailError);
                errorMessage = `Email error: ${emailError.message}`;
              }
            }

            // Send Push Notification if enabled
            if (shouldSendPush && pushSubscriptions.length > 0 && vapidPublicKey && vapidPrivateKey) {
              try {
                const notificationPayload = JSON.stringify({
                  title: `⏰ Határidő emlékeztető - ${deadlineFormatted}`,
                  body: `${document.filename} határidője: ${deadlineFormatted}`,
                  icon: `${Deno.env.get("APP_URL") || "https://govletter.com"}/favicon.ico`,
                  tag: `deadline-${analysis.id}`,
                  urgent: analysis.severity === 'urgent',
                  data: {
                    url: `${Deno.env.get("APP_URL") || "https://govletter.com"}/result/${analysis.id}`,
                    analysis_id: analysis.id
                  },
                  actions: [
                    { action: 'open', title: 'Megnyitás' }
                  ]
                });

                // Send to all user's subscriptions
                for (const subscription of pushSubscriptions) {
                  try {
                    // Use web-push library for Deno
                    const webPushResponse = await fetch("https://web-push-calc.deno.dev/send", {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                        subscription: {
                          endpoint: subscription.endpoint,
                          keys: {
                            p256dh: subscription.p256dh,
                            auth: subscription.auth
                          }
                        },
                        payload: notificationPayload,
                        vapid: {
                          subject: `mailto:${user.email}`,
                          publicKey: vapidPublicKey,
                          privateKey: vapidPrivateKey
                        }
                      })
                    });

                    if (!webPushResponse.ok) {
                      const errorText = await webPushResponse.text();
                      throw new Error(`Web Push API error: ${errorText}`);
                    }

                    pushSent = true;
                    console.log(`✅ Push sent to subscription ${subscription.id} for deadline ${deadlineFormatted}`);
                  } catch (pushError: any) {
                    console.error(`Push error for subscription ${subscription.id}:`, pushError);
                    // Remove invalid subscription (410 Gone or 404 Not Found)
                    if (pushError.message?.includes('410') || pushError.message?.includes('404')) {
                      await supabase
                        .from("push_subscriptions")
                        .delete()
                        .eq("id", subscription.id);
                    }
                    if (!errorMessage) {
                      errorMessage = `Push error: ${pushError.message}`;
                    } else {
                      errorMessage += `; Push error: ${pushError.message}`;
                    }
                  }
                }
              } catch (pushError: any) {
                console.error(`Push error for user ${user.id}:`, pushError);
                if (!errorMessage) {
                  errorMessage = `Push error: ${pushError.message}`;
                } else {
                  errorMessage += `; Push error: ${pushError.message}`;
                }
              }
            }

            // Record reminder in database
            const reminderStatus = (emailSent || pushSent) ? "sent" : (errorMessage ? "failed" : "skipped");
            
            if (existingReminder) {
              // Update existing reminder
              await supabase
                .from("deadline_reminders")
                .update({
                  sent_at: (emailSent || pushSent) ? new Date().toISOString() : null,
                  email_sent: emailSent,
                  sms_sent: false, // Keep for backward compatibility, but always false
                  status: reminderStatus,
                  error_message: errorMessage,
                })
                .eq("id", existingReminder.id);
            } else {
              // Create new reminder record
              await supabase
                .from("deadline_reminders")
                .insert({
                  analysis_id: analysis.id,
                  document_id: document.id,
                  user_id: user.id,
                  deadline_date: analysis.deadline,
                  reminder_type: reminderConfig.type,
                  sent_at: (emailSent || pushSent) ? new Date().toISOString() : null,
                  notification_method: (shouldSendEmail && shouldSendPush) ? "both" : (shouldSendEmail ? "email" : "sms"), // Keep "sms" for backward compatibility
                  email_sent: emailSent,
                  sms_sent: false, // Keep for backward compatibility
                  status: reminderStatus,
                  error_message: errorMessage,
                });
            }

            results.push({
              analysis_id: analysis.id,
              user_id: user.id,
              deadline: analysis.deadline,
              reminder_type: reminderConfig.type,
              email_sent: emailSent,
              push_sent: pushSent,
              status: reminderStatus,
            });
          } catch (userError: any) {
            console.error(`Error processing user ${user.id}:`, userError);
            results.push({
              analysis_id: analysis.id,
              user_id: user.id,
              reminder_type: reminderConfig.type,
              status: "error",
              error: userError.message,
            });
          }
        }
      } catch (reminderTypeError: any) {
        console.error(`Error processing ${reminderConfig.type} reminders:`, reminderTypeError);
        results.push({
          reminder_type: reminderConfig.type,
          status: "error",
          error: reminderTypeError.message,
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results: results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message ?? "Unexpected error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

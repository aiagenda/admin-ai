import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, AlertCircle, Info, AlertTriangle, Copy, Download, ExternalLink, ThumbsUp, ThumbsDown, MessageSquare, CalendarDays, Share2, FileText as FileTextIcon, FileDown, FileSpreadsheet } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { SmartSuggestions } from "@/components/SmartSuggestions";
import { FormCard } from "@/components/FormCard";
import { GuidedActions } from "@/components/GuidedActions";
import { LegalDisclaimer } from "@/components/LegalDisclaimer";
import { getActionPaths } from "@/lib/actionPaths";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import posthog from "posthog-js";
import { resolveAnalysisId } from "@/lib/resolveAnalysisId";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { OCRCorrectionDialog } from "@/components/OCRCorrectionDialog";
import { DocumentVersionHistory } from "@/components/DocumentVersionHistory";
import { RelatedDocuments } from "@/components/RelatedDocuments";
import { LegalReferencesPanel } from "@/components/LegalReferencesPanel";

interface Analysis {
  id?: string;
  // New fields
  simple_summary?: string | null;
  legal_summary?: string | null;
  todo_simple?: string | string[] | null;
  todo_legal?: string | string[] | null;
  // Legacy fields (for backward compatibility)
  what_is_it?: string;
  what_to_do?: string | string[];
  deadline: string | null;
  severity: "info" | "action_needed" | "urgent";
  bank_account: string | null;
  amount: string | null;
  recipient_name: string | null;
  form_key: string | null;
  required_forms: string[] | null;
  detected_category?: string | null;
  detected_tags?: string[] | null;
  // New law registry / playbook fields
  mentioned_laws?: string[] | null;
  doc_type?: string | null;
  issuer?: string | null;
  // Document metadata
  document_id?: string;
}

interface Form {
  id: string;
  key: string;
  name: string;
  pdf_url: string;
  online_url: string | null;
  institution: string;
  description: string;
  form_type?: string | null;
  category?: string | null;
  tags?: string[] | null;
  fillable_online?: boolean | null;
  fillable_url?: string | null;
  download_url?: string | null;
  print_url?: string | null;
  instructions?: string | null;
  required_documents?: string[] | null;
  deadline_info?: string | null;
  official_source_url?: string | null;
  last_updated?: string | null;
}

export default function Result() {
  const { t: tr } = useTranslation("common");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [requiredForms, setRequiredForms] = useState<Form[]>([]);
  const [paymentReliefForms, setPaymentReliefForms] = useState<Form[]>([]);
  const [actionFormsByKey, setActionFormsByKey] = useState<Map<string, Form>>(new Map());
  const [loading, setLoading] = useState(true);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"helpful" | "not_helpful" | "confusing" | null>(null);
  const [comment, setComment] = useState("");
  const [showCommentDialog, setShowCommentDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"simple" | "detailed">("simple");
  const [todoProgress, setTodoProgress] = useState<Record<number, boolean>>({});
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [shareLink, setShareLink] = useState<string>("");
  const [documentCategory, setDocumentCategory] = useState<string | null>(null);
  const [documentTags, setDocumentTags] = useState<string[] | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchAnalysis = async () => {
      try {
        let { data, error } = await supabase.from("analyses").select("*").eq("id", id).single();

        if (error) {
          const fallback = await supabase.from("analyses").select("*").eq("document_id", id).single();
          data = fallback.data;
          error = fallback.error;
        }

        if (error || !data) throw error;

        const analysisData = data as Analysis;
        setAnalysis(analysisData);
        const resolvedAnalysisId = analysisData.id;
        if (resolvedAnalysisId && id !== resolvedAnalysisId) {
          navigate(`/result/${resolvedAnalysisId}`, { replace: true });
        }
        let docCategory: string | null = (analysisData as Analysis).detected_category ?? null;

        // Fetch document metadata (category and tags)
        if (analysisData.document_id) {
          const { data: docData } = await supabase
            .from("documents")
            .select("category, tags")
            .eq("id", analysisData.document_id)
            .single();
          
          if (docData) {
            docCategory = (docData as { category?: string }).category ?? docCategory;
            setDocumentCategory(docData.category);
            setDocumentTags(docData.tags as string[] | null);
          }
        }

        // Fetch form if form_key exists (legacy support)
        if (analysisData.form_key) {
          const { data: formData, error: formError } = await supabase
            .from("forms")
            .select("*")
            .eq("key", analysisData.form_key)
            .single();

          if (!formError && formData) {
            setForm(formData as Form);
          }
        }

        // Fetch the forms referenced by the guided action paths for this doc_type
        const guided = getActionPaths(analysisData.doc_type);
        if (guided) {
          const pathFormKeys = Array.from(
            new Set(guided.paths.flatMap((p) => p.formKeys)),
          );
          if (pathFormKeys.length > 0) {
            const { data: pathForms } = await supabase
              .from("forms")
              .select("*")
              .in("key", pathFormKeys);
            if (pathForms) {
              const map = new Map<string, Form>();
              (pathForms as Form[]).forEach((f) => map.set(f.key, f));
              setActionFormsByKey(map);
            }
          }
        }

        // Fetch multiple forms if required_forms exists
        if (analysisData.required_forms && analysisData.required_forms.length > 0) {
          const { data: formsData, error: formsError } = await supabase
            .from("forms")
            .select("*")
            .in("key", analysisData.required_forms);

          if (!formsError && formsData) {
            setRequiredForms(formsData as Form[]);
          }
        }

        // US market: payment relief section disabled
        const summaryText = [analysisData.simple_summary, analysisData.legal_summary].filter(Boolean).join(" ") || "";
        const needsPaymentRelief =
          false // US market: payment relief NAV forms not applicable;
        if (needsPaymentRelief) {
          const { data: reliefForms } = await supabase
            .from("forms")
            .select("*")
            .in("key", ["nav_fizetesi_konnyites_kerelm", "nav_atvezetesi_kerelm"]);
          if (reliefForms && reliefForms.length > 0) {
            setPaymentReliefForms(reliefForms as Form[]);
          }
        }

        // Check if user already gave feedback
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: feedbackData } = await (supabase
            .from("analysis_feedback")
            .select("feedback_type")
            .eq("analysis_id", resolvedAnalysisId)
            .eq("user_id", user.id)
            .maybeSingle()) as { data: { feedback_type: string } | null };

          if (feedbackData) {
            setFeedbackGiven(true);
            setFeedbackType(feedbackData.feedback_type as "helpful" | "not_helpful" | "confusing");
          }

          // Fetch todo progress
          const { data: progressData } = await (supabase
            .from("todo_progress")
            .select("todo_index, completed")
            .eq("analysis_id", resolvedAnalysisId)
            .eq("user_id", user.id)) as { data: { todo_index: number; completed: boolean }[] | null };

          if (progressData) {
            const progressMap: Record<number, boolean> = {};
            progressData.forEach((item) => {
              progressMap[item.todo_index] = item.completed;
            });
            setTodoProgress(progressMap);
          }
        }
      } catch (error) {
        posthog.captureException(error);
        console.error("Error fetching analysis:", error);
        toast.error("Failed to load analysis");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  // Track tab views for analytics
  useEffect(() => {
    const analysisId = analysis?.id;
    if (!analysisId || !analysis?.legal_summary) return;

    const trackTabView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const tabType = activeTab === "simple" ? "simple" : "detailed";

        await (supabase.from("tab_view_analytics").insert({
          analysis_id: analysisId,
          user_id: user?.id || null,
          tab_type: tabType,
        }));
      } catch (error) {
        // Silently fail analytics - don't interrupt user experience
        console.error("Analytics tracking error:", error);
      }
    };

    // Track initial view
    trackTabView();
  }, [analysis?.id, activeTab, analysis?.legal_summary]);

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "urgent":
        return {
          label: tr("resultPage.severityUrgent"),
          icon: AlertCircle,
          className: "bg-destructive text-destructive-foreground",
        };
      case "action_needed":
        return {
          label: tr("resultPage.severityAction"),
          icon: AlertTriangle,
          className: "bg-warning text-warning-foreground",
        };
      default:
        return {
          label: tr("resultPage.severityInfo"),
          icon: Info,
          className: "bg-info text-info-foreground",
        };
    }
  };
  // Handle feedback submission
  const handleFeedback = async (type: "helpful" | "not_helpful" | "confusing") => {
    const analysisId = analysis?.id;
    if (!analysis || !analysisId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      // If user wants to add a comment, show dialog first
      if (type === "not_helpful" || type === "confusing") {
        setShowCommentDialog(true);
        setFeedbackType(type);
        return;
      }

      // Check if feedback already exists
      const { data: existingFeedback } = await (supabase
        .from("analysis_feedback")
        .select("id")
        .eq("analysis_id", analysisId)
        .eq("user_id", user.id)
        .maybeSingle()) as { data: { id: string } | null };

      if (existingFeedback) {
        // Update existing feedback
        const { error } = await (supabase
          .from("analysis_feedback")
          .update({
            feedback_type: type,
            summary_type: activeTab,
            comment: null,
          })
          .eq("id", existingFeedback.id));

        if (error) throw error;
      } else {
        // Insert new feedback
        const { error } = await (supabase.from("analysis_feedback").insert({
          analysis_id: analysisId,
          user_id: user.id,
          feedback_type: type,
          summary_type: activeTab,
          comment: null,
        }));

        if (error) throw error;
      }

      setFeedbackGiven(true);
      setFeedbackType(type);
      posthog.capture("analysis feedback submitted", { analysis_id: analysisId, feedback_type: type, summary_type: activeTab });
      toast.success("Thanks for your feedback!");
    } catch (error) {
      posthog.captureException(error);
      console.error("Feedback error:", error);
      toast.error("Failed to submit feedback");
    }
  };

  // Toggle todo completion
  const toggleTodo = async (index: number) => {
    const analysisId = analysis?.id;
    if (!analysisId) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      const newCompleted = !todoProgress[index];
      
      const { error } = await (supabase.from("todo_progress").upsert({
        analysis_id: analysisId,
        user_id: user.id,
        todo_index: index,
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
      }, {
        onConflict: "analysis_id,user_id,todo_index"
      }));

      if (error) throw error;

      setTodoProgress((prev) => ({
        ...prev,
        [index]: newCompleted,
      }));

      if (newCompleted) {
        toast.success("Step marked complete!");
      } else {
        toast.success("Step unmarked");
      }
    } catch (error) {
      console.error("Todo toggle error:", error);
      toast.error("Failed to update step");
    }
  };

  // Export analysis as a clean, native PDF (selectable text + vector, real pagination)
  const exportAsPDF = async () => {
    if (!analysis) return;
    const { default: jsPDF } = await import("jspdf");

    try {
      toast.info("Generating PDF…");

      const doc = new jsPDF("p", "mm", "a4");
      const pageW = 210;
      const pageH = 297;
      const margin = 18;
      const contentW = pageW - margin * 2;
      const bottomLimit = pageH - 20; // keep clear of footer
      const lineH = 5.2;

      const c = {
        brand: [37, 99, 235] as [number, number, number],
        brandDark: [29, 78, 216] as [number, number, number],
        brandTint: [239, 246, 255] as [number, number, number],
        urgent: [220, 38, 38] as [number, number, number],
        urgentTint: [254, 242, 242] as [number, number, number],
        action: [217, 119, 6] as [number, number, number],
        actionTint: [255, 247, 237] as [number, number, number],
        info: [59, 130, 246] as [number, number, number],
        infoTint: [239, 246, 255] as [number, number, number],
        heading: [15, 23, 42] as [number, number, number],
        body: [51, 65, 85] as [number, number, number],
        muted: [100, 116, 139] as [number, number, number],
        border: [226, 232, 240] as [number, number, number],
        boxBg: [248, 250, 252] as [number, number, number],
        white: [255, 255, 255] as [number, number, number],
      };

      const sevTint: Record<string, [number, number, number]> = {
        urgent: c.urgentTint,
        action_needed: c.actionTint,
        info: c.infoTint,
      };

      // Days-until-deadline helper -> human phrase
      const deadlinePhrase = (dateStr: string): string => {
        const d = new Date(dateStr);
        const today = new Date();
        d.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);
        const days = Math.round((d.getTime() - today.getTime()) / 86400000);
        if (days < 0) return `Overdue by ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"}`;
        if (days === 0) return "Due today";
        if (days === 1) return "Due tomorrow";
        return `In ${days} days`;
      };

      const severityMeta: Record<string, { label: string; color: [number, number, number] }> = {
        urgent: { label: tr("resultPage.severityUrgent"), color: c.urgent },
        action_needed: { label: tr("resultPage.severityAction"), color: c.action },
        info: { label: tr("resultPage.severityInfo"), color: c.info },
      };
      const sev = severityMeta[analysis.severity] || severityMeta.info;

      let y = 0;

      // ---------- Header band ----------
      const headerH = 32;
      doc.setFillColor(c.brand[0], c.brand[1], c.brand[2]);
      doc.rect(0, 0, pageW, headerH, "F");
      doc.setFillColor(c.brandDark[0], c.brandDark[1], c.brandDark[2]);
      doc.rect(0, headerH - 1.2, pageW, 1.2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(21);
      doc.text("GovLetter", margin, 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(191, 219, 254);
      doc.text("DOCUMENT ANALYSIS", margin, 21, { charSpace: 0.8 });

      // Status pill, right side of header
      {
        const label = sev.label.toUpperCase();
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        const pw = doc.getTextWidth(label) + 8;
        const ph = 7.5;
        const px = pageW - margin - pw;
        const py = 10;
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(px, py, pw, ph, 3.75, 3.75, "F");
        doc.setTextColor(sev.color[0], sev.color[1], sev.color[2]);
        doc.text(label, px + 4, py + 5);
      }

      y = headerH + 12;

      const newPage = () => {
        doc.addPage();
        y = margin + 4;
      };
      const ensure = (needed: number) => {
        if (y + needed > bottomLimit) newPage();
      };

      // ---------- Title block (doc type + issuer) ----------
      const docTitle = analysis.doc_type || "Document Analysis";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(17);
      doc.setTextColor(c.heading[0], c.heading[1], c.heading[2]);
      (doc.splitTextToSize(docTitle, contentW) as string[]).forEach((line) => {
        doc.text(line, margin, y);
        y += 7.5;
      });
      if (analysis.issuer) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
        doc.text(analysis.issuer, margin, y);
        y += 6;
      }
      y += 3;

      // ---------- "At a glance" key-facts card ----------
      const facts: { label: string; value: string; sub?: string; color?: [number, number, number] }[] = [];
      if (analysis.amount) facts.push({ label: "Amount", value: analysis.amount });
      if (analysis.deadline)
        facts.push({
          label: "Deadline",
          value: format(new Date(analysis.deadline), "MMM d, yyyy", { locale: enUS }),
          sub: deadlinePhrase(analysis.deadline),
        });
      facts.push({ label: "Status", value: sev.label, color: sev.color });
      {
        const cardH = 22;
        ensure(cardH + 6);
        doc.setFillColor(c.boxBg[0], c.boxBg[1], c.boxBg[2]);
        doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, y, contentW, cardH, 2, 2, "FD");
        const colW = contentW / facts.length;
        facts.forEach((f, i) => {
          const cx = margin + colW * i;
          if (i > 0) {
            doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
            doc.setLineWidth(0.2);
            doc.line(cx, y + 4, cx, y + cardH - 4);
          }
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
          doc.text(f.label.toUpperCase(), cx + 6, y + 8, { charSpace: 0.5 });
          doc.setFont("helvetica", "bold");
          doc.setFontSize(13);
          const vc = f.color || c.heading;
          doc.setTextColor(vc[0], vc[1], vc[2]);
          const v = (doc.splitTextToSize(f.value, colW - 10) as string[])[0] || "";
          doc.text(v, cx + 6, y + 16);
          if (f.sub) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
            doc.text(f.sub, cx + 6, y + 20);
          }
        });
        y += cardH + 9;
      }

      // ---------- Section helpers ----------
      const sectionHeading = (title: string) => {
        ensure(15);
        doc.setFillColor(c.brand[0], c.brand[1], c.brand[2]);
        doc.roundedRect(margin, y - 3.8, 1.6, 5.2, 0.6, 0.6, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12.5);
        doc.setTextColor(c.heading[0], c.heading[1], c.heading[2]);
        doc.text(title, margin + 5, y);
        y += 4.5;
        doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
        doc.setLineWidth(0.2);
        doc.line(margin, y, pageW - margin, y);
        y += 5.5;
      };
      const paragraph = (text: string) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10.5);
        doc.setTextColor(c.body[0], c.body[1], c.body[2]);
        const lines = doc.splitTextToSize(text, contentW) as string[];
        for (const line of lines) {
          ensure(lineH);
          doc.text(line, margin, y);
          y += lineH;
        }
        y += 4;
      };

      // Plain English
      if (analysis.simple_summary) {
        sectionHeading(tr("resultPage.simpleTab"));
        paragraph(analysis.simple_summary);
      }
      // Legal detail
      if (analysis.legal_summary) {
        sectionHeading(tr("resultPage.legalTab"));
        paragraph(analysis.legal_summary);
      }

      // To-do with progress bar
      if (todoSimple.length > 0) {
        const done = Object.values(todoProgress).filter(Boolean).length;
        const pct = Math.round((done / todoSimple.length) * 100);
        sectionHeading("What to do");
        ensure(12);
        const barW = contentW;
        const barH = 2.4;
        const barY = y - 1;
        doc.setFillColor(c.border[0], c.border[1], c.border[2]);
        doc.roundedRect(margin, barY, barW, barH, 1.2, 1.2, "F");
        if (pct > 0) {
          doc.setFillColor(c.brand[0], c.brand[1], c.brand[2]);
          doc.roundedRect(margin, barY, Math.max(barH, (barW * pct) / 100), barH, 1.2, 1.2, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
        doc.text(`${done} of ${todoSimple.length} done · ${pct}%`, margin, barY + barH + 5);
        y = barY + barH + 11;
        todoSimple.forEach((step, i) => {
          const isDone = todoProgress[i] || false;
          const textX = margin + 7;
          const lines = doc.splitTextToSize(step, contentW - 7) as string[];
          ensure(Math.max(lineH, lines.length * lineH) + 2);
          const boxY = y - 3.6;
          doc.setLineWidth(0.3);
          if (isDone) {
            doc.setFillColor(c.brand[0], c.brand[1], c.brand[2]);
            doc.setDrawColor(c.brand[0], c.brand[1], c.brand[2]);
            doc.roundedRect(margin, boxY, 4, 4, 0.8, 0.8, "FD");
            // white check mark
            doc.setDrawColor(255, 255, 255);
            doc.setLineWidth(0.5);
            doc.line(margin + 0.9, boxY + 2.1, margin + 1.7, boxY + 2.9);
            doc.line(margin + 1.7, boxY + 2.9, margin + 3.2, boxY + 1.1);
          } else {
            doc.setDrawColor(c.muted[0], c.muted[1], c.muted[2]);
            doc.roundedRect(margin, boxY, 4, 4, 0.8, 0.8, "S");
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
          const tc = isDone ? c.muted : c.body;
          doc.setTextColor(tc[0], tc[1], tc[2]);
          lines.forEach((line, li) => {
            if (li > 0) ensure(lineH);
            doc.text(line, textX, y);
            y += lineH;
          });
          y += 3;
        });
        y += 3;
      }

      // Payment details
      if (analysis.recipient_name || analysis.bank_account || analysis.amount) {
        sectionHeading("Payment details");
        const detailRow = (label: string, value: string) => {
          ensure(lineH + 6);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
          doc.text(label.toUpperCase(), margin, y, { charSpace: 0.4 });
          y += 4.6;
          doc.setFont("courier", "bold");
          doc.setFontSize(11);
          doc.setTextColor(c.heading[0], c.heading[1], c.heading[2]);
          (doc.splitTextToSize(value, contentW) as string[]).forEach((line) => {
            ensure(lineH);
            doc.text(line, margin, y);
            y += lineH;
          });
          y += 3.5;
        };
        if (analysis.recipient_name) detailRow("Payee", analysis.recipient_name);
        if (analysis.bank_account) detailRow("Account / Reference", analysis.bank_account);
        if (analysis.amount) detailRow("Amount", analysis.amount);
        y += 2;
      }

      // References (mentioned laws)
      if (analysis.mentioned_laws && analysis.mentioned_laws.length > 0) {
        sectionHeading("References");
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(c.body[0], c.body[1], c.body[2]);
        (doc.splitTextToSize(analysis.mentioned_laws.join("   •   "), contentW) as string[]).forEach((line) => {
          ensure(lineH);
          doc.text(line, margin, y);
          y += lineH;
        });
        y += 4;
      }

      // Disclaimer
      ensure(14);
      y += 1;
      doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
      doc.setLineWidth(0.2);
      doc.line(margin, y, pageW - margin, y);
      y += 4;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
      const disclaimer =
        "GovLetter is a document-explanation tool, not a tax advisor or law firm. Always verify deadlines and amounts against your original notice and consult a qualified professional before taking action.";
      (doc.splitTextToSize(disclaimer, contentW) as string[]).forEach((line) => {
        ensure(4.4);
        doc.text(line, margin, y);
        y += 4.4;
      });

      // ---------- Footers ----------
      const totalPages = doc.getNumberOfPages();
      const genStr = `Generated ${format(new Date(), "MMMM d, yyyy 'at' h:mm a", { locale: enUS })}`;
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setDrawColor(c.border[0], c.border[1], c.border[2]);
        doc.setLineWidth(0.2);
        doc.line(margin, pageH - 14, pageW - margin, pageH - 14);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(c.brand[0], c.brand[1], c.brand[2]);
        doc.text("GovLetter", margin, pageH - 9);
        const brandW = doc.getTextWidth("GovLetter");
        doc.setFont("helvetica", "normal");
        doc.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
        doc.text(genStr, margin + brandW + 4, pageH - 9);
        doc.text(`Page ${p} of ${totalPages}`, pageW - margin, pageH - 9, { align: "right" });
      }

      const fileName = `govletter-analysis-${id?.substring(0, 8) || "unknown"}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      doc.save(fileName);
      posthog.capture("analysis exported as pdf", { analysis_id: id });
      toast.success("PDF downloaded!");
    } catch (error) {
      posthog.captureException(error instanceof Error ? error : new Error(String(error)));
      console.error("PDF export error:", error);
      toast.error("Failed to generate PDF");
    }
  };


  // Generate share link
  const generateShareLink = async () => {
    if (!id) return;

    try {
      // For now, just create a read-only link (in future, could add expiration)
      const link = `${window.location.origin}/result/${id}`;
      setShareLink(link);
      setShowShareDialog(true);
      posthog.capture("analysis shared", { analysis_id: id });
    } catch (error) {
      console.error("Share link error:", error);
      toast.error("Failed to create share link");
    }
  };

  // Submit feedback with comment
  const submitFeedbackWithComment = async () => {
    const analysisId = analysis?.id;
    if (!analysis || !analysisId || !feedbackType) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in");
        return;
      }

      // Check if feedback already exists
      const { data: existingFeedback } = await (supabase
        .from("analysis_feedback")
        .select("id")
        .eq("analysis_id", analysisId)
        .eq("user_id", user.id)
        .maybeSingle()) as { data: { id: string } | null };

      if (existingFeedback) {
        // Update existing feedback
        const { error } = await (supabase
          .from("analysis_feedback")
          .update({
            feedback_type: feedbackType,
            summary_type: activeTab,
            comment: comment || null,
          })
          .eq("id", existingFeedback.id));

        if (error) throw error;
      } else {
        // Insert new feedback
        const { error } = await (supabase.from("analysis_feedback").insert({
          analysis_id: analysisId,
          user_id: user.id,
          feedback_type: feedbackType,
          summary_type: activeTab,
          comment: comment || null,
        }));

        if (error) throw error;
      }

      setFeedbackGiven(true);
      posthog.capture("analysis feedback submitted", {
        analysis_id: analysisId,
        feedback_type: feedbackType,
        summary_type: activeTab,
        has_comment: Boolean(comment),
      });
      toast.success("Thanks for your feedback!");
      setShowCommentDialog(false);
      setComment("");
    } catch (error) {
      posthog.captureException(error);
      console.error("Feedback error:", error);
      toast.error("Failed to submit feedback");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Analysis not found</CardTitle>
            <CardDescription>This analysis does not exist or is still being processed.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/archive")} className="w-full">
              {tr("resultPage.back")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const severityConfig = getSeverityConfig(analysis.severity);
  const SeverityIcon = severityConfig.icon;

  // Parse summaries - use new fields if available, fallback to legacy
  const simpleSummary = analysis.simple_summary || analysis.what_is_it || "";
  const legalSummary = analysis.legal_summary || "";

  // Parse todo lists - use new fields if available, fallback to legacy
  const parseTodoList = (field: string | string[] | null | undefined, fallback: string | string[] | null | undefined): string[] => {
    if (field) {
      if (Array.isArray(field)) return field;
      try {
        const parsed = JSON.parse(field);
        if (Array.isArray(parsed)) return parsed;
        return [field];
      } catch {
        return [field];
      }
    }
    if (fallback) {
      if (Array.isArray(fallback)) return fallback;
      try {
        const parsed = JSON.parse(fallback);
        if (Array.isArray(parsed)) return parsed;
        return [fallback];
    } catch {
        return [fallback];
      }
    }
    return [];
  };

  const todoSimple = parseTodoList(analysis.todo_simple, analysis.what_to_do);
  const todoLegal = parseTodoList(analysis.todo_legal, null);

  // Guided "what would you like to do?" paths for this document type
  const guidedActions = getActionPaths(analysis.doc_type);

  // Calculate todo progress percentage
  const todoProgressPercentage = todoSimple.length > 0
    ? Math.round((Object.values(todoProgress).filter(Boolean).length / todoSimple.length) * 100)
    : 0;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate("/archive")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {tr("resultPage.back")}
        </Button>

        <LegalDisclaimer variant="analysis" />

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4">
              <div className="space-y-2 min-w-0">
                <CardTitle className="text-xl sm:text-2xl">{tr("resultPage.title")}</CardTitle>
                <CardDescription>{tr("resultPage.subtitle")}</CardDescription>
              </div>
              <Badge className={severityConfig.className}>
                <SeverityIcon className="mr-1 h-3 w-3" />
                {severityConfig.label}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Summary Section with Tabs */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <h3 className="text-lg font-semibold break-words">{tr("resultPage.aboutTitle")}</h3>
                <HelpTooltip 
                  content={tr("resultPage.tabTooltip")}
                  helpPageAnchor="results"
                />
              </div>
              {legalSummary ? (
                <Tabs 
                  defaultValue="simple" 
                  className="w-full"
                  value={activeTab}
                  onValueChange={(value) => setActiveTab(value as "simple" | "detailed")}
                >
                  <TabsList className="grid w-full grid-cols-2 min-h-[44px] h-auto">
                    <TabsTrigger value="simple" className="min-h-[44px] touch-manipulation whitespace-normal text-center text-xs sm:text-sm px-2 py-2">
                      <span className="hidden sm:inline">{tr("resultPage.simpleTab")}</span>
                      <span className="sm:hidden">{tr("resultPage.simpleTabShort", { defaultValue: tr("resultPage.simpleTab") })}</span>
                    </TabsTrigger>
                    <TabsTrigger value="legal" className="min-h-[44px] touch-manipulation whitespace-normal text-center text-xs sm:text-sm px-2 py-2">
                      <span className="hidden sm:inline">{tr("resultPage.legalTab")}</span>
                      <span className="sm:hidden">{tr("resultPage.legalTabShort", { defaultValue: tr("resultPage.legalTab") })}</span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="simple" className="mt-4">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{simpleSummary}</p>
                  </TabsContent>
                  <TabsContent value="legal" className="mt-4">
                    <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{legalSummary}</p>
                  </TabsContent>
                </Tabs>
              ) : (
                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{simpleSummary}</p>
              )}

              {/* Feedback Section */}
              {legalSummary && (
                <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
                  <span className="text-sm text-muted-foreground">{tr("resultPage.feedbackQuestion")}</span>
                  <div className="flex items-center gap-2">
                    {!feedbackGiven ? (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback("helpful")}
                          className="h-8 w-8 p-0"
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback("not_helpful")}
                          className="h-8 w-8 p-0"
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleFeedback("confusing")}
                          className="h-8 w-8 p-0"
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {feedbackType === "helpful" && (
                          <>
                            <ThumbsUp className="h-4 w-4 text-green-600" />
                            <span>Thanks for your feedback!</span>
                          </>
                        )}
                        {feedbackType === "not_helpful" && (
                          <>
                            <ThumbsDown className="h-4 w-4 text-red-600" />
                            <span>Thanks for your feedback!</span>
                          </>
                        )}
                        {feedbackType === "confusing" && (
                          <>
                            <MessageSquare className="h-4 w-4 text-orange-600" />
                            <span>Thanks for your feedback!</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Comment Dialog */}
            <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Feedback</DialogTitle>
                  <DialogDescription>
                    {feedbackType === "not_helpful" && "Why was this information not helpful?"}
                    {feedbackType === "confusing" && "What was confusing? How could we improve?"}
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Describe your feedback…"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowCommentDialog(false);
                    setComment("");
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={submitFeedbackWithComment}>
                    Submit
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Todo Section - Only Simple Steps */}
            <div className="border-t pt-6 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">What to do?</h3>
                  <HelpTooltip 
                    content="Check off each step as you go. Your progress is tracked as a percentage."
                    helpPageAnchor="results"
                  />
                </div>
                {todoSimple.length > 0 && (
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-muted rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${todoProgressPercentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {todoProgressPercentage}%
                    </span>
                  </div>
                )}
              </div>
              {todoSimple.length > 0 ? (
                <div className="space-y-2">
                  {todoSimple.map((step, i) => {
                    const isCompleted = todoProgress[i] || false;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          checked={isCompleted}
                          onCheckedChange={() => toggleTodo(i)}
                          className="mt-1"
                        />
                        <label
                          className={`flex-1 cursor-pointer leading-relaxed ${
                            isCompleted ? "line-through text-muted-foreground" : "text-foreground"
                          }`}
                          onClick={() => toggleTodo(i)}
                        >
                          {step}
                        </label>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">No action items</p>
              )}
            </div>

            {/* Guided decision flow: ask the user what they want to do, then
                reveal only the relevant steps + AI-prefilled form. */}
            {guidedActions && (
              <div className="border-t pt-6">
                <GuidedActions
                  result={guidedActions}
                  formsByKey={actionFormsByKey}
                  analysisId={analysis.id || id}
                />
              </div>
            )}

            {/* Legacy form lists — only when there is no tailored guided flow,
                to avoid overwhelming the user with duplicate options. */}
            {!guidedActions && requiredForms.length > 0 && (
              <div className="border-t pt-6 space-y-3">
                <h3 className="text-lg font-semibold">Required Forms</h3>
                <div className="space-y-4">
                  {requiredForms.map((formItem) => (
                    <FormCard key={formItem.id} form={formItem} />
                  ))}
                </div>
              </div>
            )}

            {!guidedActions && paymentReliefForms.length > 0 && (
              <div className="border-t pt-6 space-y-3">
                <h3 className="text-lg font-semibold">Payment Plan / Relief – Forms</h3>
                <p className="text-sm text-muted-foreground">
                  Based on this document, consider requesting a payment plan or penalty relief. Download the relevant forms below.
                </p>
                <div className="space-y-4">
                  {paymentReliefForms.map((formItem) => (
                    <FormCard key={formItem.id} form={formItem} />
                  ))}
                </div>
              </div>
            )}

            {!guidedActions && form && (
              <div className="border-t pt-6 space-y-3">
                <h3 className="text-lg font-semibold">Required Official Form</h3>
                <FormCard form={form} />
              </div>
            )}

            {analysis.deadline && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Deadline</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(analysis.deadline), "yyyy. MMMM d.", { locale: enUS })}
                    </p>
                  </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const deadlineDate = new Date(analysis.deadline);
                      const endDate = new Date(deadlineDate.getTime() + 60 * 60 * 1000);
                      
                      const formatDate = (date: Date) => {
                        return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
                      };
                      
                      const icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//GovLetter//Deadline Reminder//EN
BEGIN:VEVENT
UID:${id}@govletter.com
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(deadlineDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Deadline: ${analysis.simple_summary?.substring(0, 50) || "Document deadline"}
DESCRIPTION:Document deadline\\nGovLetter - ${window.location.origin}/result/${id}
LOCATION:GovLetter
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
                      
                      const blob = new Blob([icalContent], { type: "text/calendar" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `deadline-${format(deadlineDate, "yyyy-MM-dd")}.ics`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      posthog.capture("deadline calendar exported", {
                        analysis_id: analysis.id,
                        deadline: analysis.deadline,
                      });
                      toast.success("Calendar event downloaded!");
                    }}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Add to Calendar
                  </Button>
                </div>
              </div>
            )}

            {/* Payment details – shown only when account or amount is present */}
            {(analysis.bank_account || analysis.amount) && (
              <div className="border-t pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Payment Details</h3>
                  <HelpTooltip 
                    content="If the AI misread any handwritten values, you can correct them here. This helps improve accuracy."
                    helpPageAnchor="results"
                  />
                </div>
                
                {/* Payee shown only when payment info is present */}
                {analysis.recipient_name && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Payee</p>
                      <p className="font-mono">{analysis.recipient_name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(analysis.recipient_name!);
                        toast.success("Copied!");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {analysis.bank_account && (
                  <OCRCorrectionDialog
                    label="Account / Reference"
                    extractedValue={analysis.bank_account}
                    analysisId={analysis.id || id || ""}
                    documentId={analysis.document_id || ""}
                    fieldType="bank_account"
                  />
                )}

                {analysis.amount && (
                  <OCRCorrectionDialog
                    label="Amount"
                    extractedValue={analysis.amount}
                    analysisId={analysis.id || id || ""}
                    documentId={analysis.document_id || ""}
                    fieldType="amount"
                  />
                )}
              </div>
            )}

            {/* Legal References & Playbook */}
            <div className="border-t pt-6">
              <LegalReferencesPanel
                mentionedLaws={analysis.mentioned_laws}
                detectedTags={documentTags || analysis.detected_tags}
                detectedCategory={documentCategory || analysis.detected_category}
                docType={analysis.doc_type}
              />
            </div>

            {/* Smart Suggestions */}
            <div className="border-t pt-6">
              <SmartSuggestions 
                category={documentCategory} 
                tags={documentTags}
                severity={analysis.severity}
              />
            </div>
          </CardContent>
        </Card>

        {/* Version History and Related Documents */}
        <div className="grid gap-6 md:grid-cols-2">
          {analysis.document_id && (
            <>
              <DocumentVersionHistory 
                documentId={analysis.document_id}
                currentVersion={1}
              />
              <RelatedDocuments documentId={analysis.document_id} />
            </>
          )}
        </div>

        <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Button onClick={() => navigate("/upload")} className="flex-1 min-h-[44px] touch-manipulation">
            Upload New Document
          </Button>
          <Button onClick={() => navigate("/archive")} variant="outline" className="flex-1 min-h-[44px] touch-manipulation">
            View Archive
          </Button>
        </div>
          
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <Button onClick={exportAsPDF} variant="outline" size="sm" className="min-h-[44px] touch-manipulation w-full sm:w-auto">
              <FileDown className="h-4 w-4 mr-2" />
              Export as PDF
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/archive#export-accountant")}
              variant="outline"
              size="sm"
              className="min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV / Excel Export
            </Button>
            <Button onClick={generateShareLink} variant="outline" size="sm" className="min-h-[44px] touch-manipulation w-full sm:w-auto">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            Build an accountant-ready spreadsheet in Archive (filter by date, amount, or deadline).
          </p>
        </div>

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Link</DialogTitle>
              <DialogDescription>
                Copy this link to share the analysis with others
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-2">
              <Input
                value={shareLink}
                readOnly
                className="flex-1"
              />
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  toast.success("Link copied!");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

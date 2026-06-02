import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Calendar, AlertCircle, Info, AlertTriangle, Copy, Download, ExternalLink, ThumbsUp, ThumbsDown, MessageSquare, CalendarDays, Share2, FileText as FileTextIcon, FileDown, FileSpreadsheet } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { SmartSuggestions } from "@/components/SmartSuggestions";
import { FormCard } from "@/components/FormCard";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
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
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [form, setForm] = useState<Form | null>(null);
  const [requiredForms, setRequiredForms] = useState<Form[]>([]);
  const [paymentReliefForms, setPaymentReliefForms] = useState<Form[]>([]);
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

        // Részletfizetés / fizetési könnyítés: NAV nyomtatványok, ha adózás + kulcsszavak
        const summaryText = [analysisData.simple_summary, analysisData.legal_summary].filter(Boolean).join(" ") || "";
        const needsPaymentRelief =
          docCategory === "adozas" &&
          /részletfizetés|átvezetés|fizetési könnyítés|végrehajtás/i.test(summaryText);
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
            .from("analysis_feedback" as any)
            .select("feedback_type")
            .eq("analysis_id", id)
            .eq("user_id", user.id)
            .single()) as { data: { feedback_type: string } | null };

          if (feedbackData) {
            setFeedbackGiven(true);
            setFeedbackType(feedbackData.feedback_type as "helpful" | "not_helpful" | "confusing");
          }

          // Fetch todo progress
          const { data: progressData } = await (supabase
            .from("todo_progress" as any)
            .select("todo_index, completed")
            .eq("analysis_id", id)
            .eq("user_id", user.id)) as { data: { todo_index: number; completed: boolean }[] | null };

          if (progressData) {
            const progressMap: Record<number, boolean> = {};
            progressData.forEach((item) => {
              progressMap[item.todo_index] = item.completed;
            });
            setTodoProgress(progressMap);
          }
        }
      } catch (error: any) {
        console.error("Error fetching analysis:", error);
        toast.error("Hiba az elemzés betöltése során");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
  }, [id]);

  // Track tab views for analytics
  useEffect(() => {
    if (!id || !analysis?.legal_summary) return;

    const trackTabView = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const tabType = activeTab === "simple" ? "simple" : "detailed";

        await (supabase.from("tab_view_analytics" as any).insert({
          analysis_id: id,
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
  }, [id, activeTab, analysis?.legal_summary]);

  const getSeverityConfig = (severity: string) => {
    switch (severity) {
      case "urgent":
        return {
          label: "Sürgős",
          icon: AlertCircle,
          className: "bg-destructive text-destructive-foreground",
        };
      case "action_needed":
        return {
          label: "Teendő",
          icon: AlertTriangle,
          className: "bg-warning text-warning-foreground",
        };
      default:
        return {
          label: "Információ",
          icon: Info,
          className: "bg-info text-info-foreground",
        };
    }
  };
  // Handle feedback submission
  const handleFeedback = async (type: "helpful" | "not_helpful" | "confusing") => {
    if (!analysis || !id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Be kell jelentkezned");
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
        .from("analysis_feedback" as any)
        .select("id")
        .eq("analysis_id", id)
        .eq("user_id", user.id)
        .single()) as { data: { id: string } | null };

      if (existingFeedback) {
        // Update existing feedback
        const { error } = await (supabase
          .from("analysis_feedback" as any)
          .update({
            feedback_type: type,
            summary_type: activeTab,
            comment: null,
          })
          .eq("id", existingFeedback.id));

        if (error) throw error;
      } else {
        // Insert new feedback
        const { error } = await (supabase.from("analysis_feedback" as any).insert({
          analysis_id: id,
          user_id: user.id,
          feedback_type: type,
          summary_type: activeTab,
          comment: null,
        }));

        if (error) throw error;
      }

      setFeedbackGiven(true);
      setFeedbackType(type);
      toast.success("Köszönjük a visszajelzést!");
    } catch (error: any) {
      console.error("Feedback error:", error);
      toast.error("Hiba a visszajelzés küldése során");
    }
  };

  // Toggle todo completion
  const toggleTodo = async (index: number) => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Be kell jelentkezned");
        return;
      }

      const newCompleted = !todoProgress[index];
      
      const { error } = await (supabase.from("todo_progress" as any).upsert({
        analysis_id: id,
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
        toast.success("Teendő bejelölve!");
      } else {
        toast.success("Teendő visszavonva");
      }
    } catch (error: any) {
      console.error("Todo toggle error:", error);
      toast.error("Hiba a teendő frissítése során");
    }
  };

  // Export analysis as PDF - html2canvas + jsPDF with proper multi-page handling
  const exportAsPDF = async () => {
    if (!analysis) return;

    try {
      toast.info("PDF generálása...");
      
      // Create a hidden container for PDF content
      const pdfContainer = document.createElement("div");
      pdfContainer.style.position = "absolute";
      pdfContainer.style.left = "-9999px";
      pdfContainer.style.width = "210mm"; // A4 width
      pdfContainer.style.padding = "20mm";
      pdfContainer.style.backgroundColor = "#ffffff";
      pdfContainer.style.fontFamily = "system-ui, -apple-system, sans-serif";
      pdfContainer.style.color = "#1e293b";
      pdfContainer.style.lineHeight = "1.6";
      
      // Build HTML content
      const severityLabels: Record<string, string> = {
        urgent: "Sürgős",
        action_needed: "Teendő",
        info: "Információ"
      };
      const severityColors: Record<string, string> = {
        urgent: "#dc2626",
        action_needed: "#eab308",
        info: "#3b82f6"
      };
      
      const severityLabel = severityLabels[analysis.severity] || "Információ";
      const severityColor = severityColors[analysis.severity] || "#3b82f6";
      const todoList = parseTodoList(analysis.todo_simple, analysis.what_to_do);
      const progressPercentage = todoSimple.length > 0
        ? Math.round((Object.values(todoProgress).filter(Boolean).length / todoSimple.length) * 100)
        : 0;
      
      // Helper to escape HTML
      const escapeHtml = (text: string | null | undefined) => {
        if (!text) return '';
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      };
      
      pdfContainer.innerHTML = `
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px 20px; margin: -20mm -20mm 30px -20mm; color: white;">
          <h1 style="margin: 0; font-size: 32px; font-weight: bold;">AdminAI</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Dokumentum Elemzés</p>
        </div>
        
        <div style="margin-bottom: 25px;">
          <span style="background-color: ${severityColor}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block;">
            ${severityLabel}
          </span>
        </div>
        
        ${analysis.simple_summary ? `
          <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #1e293b;">Egyszerű Magyarázat</h2>
            <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(analysis.simple_summary)}</p>
          </div>
        ` : ''}
        
        ${analysis.legal_summary ? `
          <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #1e293b;">Részletes Magyarázat</h2>
            <p style="margin: 0; font-size: 13px; color: #334155; line-height: 1.7; white-space: pre-wrap;">${escapeHtml(analysis.legal_summary)}</p>
          </div>
        ` : ''}
        
        ${todoList.length > 0 ? `
          <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
              <h2 style="margin: 0; font-size: 18px; font-weight: bold; color: #1e293b;">Mit kell tennie?</h2>
              <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 100px; height: 8px; background-color: #e2e8f0; border-radius: 4px; overflow: hidden;">
                  <div style="width: ${progressPercentage}%; height: 100%; background-color: #3b82f6;"></div>
                </div>
                <span style="font-size: 11px; color: #64748b;">${progressPercentage}%</span>
              </div>
            </div>
            ${todoList.map((step, i) => {
              const isCompleted = todoProgress[i] || false;
              return `
                <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 12px; padding: 12px; background-color: ${isCompleted ? '#f8fafc' : '#ffffff'}; border: 1px solid #e2e8f0; border-radius: 6px;">
                  <div style="width: 18px; height: 18px; border: 2px solid #64748b; border-radius: 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px;">
                    ${isCompleted ? '<span style="color: #3b82f6; font-size: 14px; font-weight: bold;">✓</span>' : ''}
                  </div>
                  <p style="margin: 0; font-size: 13px; color: ${isCompleted ? '#94a3b8' : '#334155'}; line-height: 1.6; ${isCompleted ? 'text-decoration: line-through;' : ''} flex: 1;">
                    ${escapeHtml(step)}
                  </p>
                </div>
              `;
            }).join('')}
          </div>
        ` : ''}
        
        ${analysis.deadline ? `
          <div style="margin-bottom: 30px; padding: 15px; background-color: #f9fafb; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0 0 5px 0; font-size: 12px; font-weight: bold; color: #1e293b;">Határidő</p>
            <p style="margin: 0; font-size: 14px; color: #334155;">${format(new Date(analysis.deadline), "yyyy. MMMM d.", { locale: hu })}</p>
          </div>
        ` : ''}
        
        ${(analysis.bank_account || analysis.amount) ? `
          <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
            <h2 style="margin: 0 0 15px 0; font-size: 18px; font-weight: bold; color: #1e293b;">Fizetési Adatok</h2>
            ${analysis.recipient_name ? `
              <div style="margin-bottom: 12px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; font-weight: 500;">Kedvezményezett</p>
                <p style="margin: 0; font-size: 13px; color: #334155; font-weight: 600; font-family: monospace;">${escapeHtml(analysis.recipient_name)}</p>
              </div>
            ` : ''}
            ${analysis.bank_account ? `
              <div style="margin-bottom: 12px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; font-weight: 500;">Bankszámlaszám</p>
                <p style="margin: 0; font-size: 13px; color: #334155; font-weight: 600; font-family: monospace;">${escapeHtml(analysis.bank_account)}</p>
              </div>
            ` : ''}
            ${analysis.amount ? `
              <div style="margin-bottom: 12px;">
                <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748b; font-weight: 500;">Összeg</p>
                <p style="margin: 0; font-size: 13px; color: #334155; font-weight: 600; font-family: monospace;">${escapeHtml(analysis.amount)}</p>
              </div>
            ` : ''}
          </div>
        ` : ''}
        
        <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0; text-align: center;">
          <p style="margin: 0; font-size: 10px; color: #94a3b8;">
            AdminAI - ${window.location.origin} | Generálva: ${format(new Date(), "yyyy. MMMM d. HH:mm", { locale: hu })}
          </p>
        </div>
      `;
      
      document.body.appendChild(pdfContainer);
      
      // Wait for fonts and images to load
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force reflow
      pdfContainer.offsetHeight;
      
      // Capture as high-quality image
      const canvas = await html2canvas(pdfContainer, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: false,
      });
      
      // Remove container
      document.body.removeChild(pdfContainer);
      
      // Create PDF - original simple version
      const doc = new jsPDF("p", "mm", "a4");
      const imgData = canvas.toDataURL("image/png", 1.0);
      
      // Calculate dimensions - maintain aspect ratio
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;
      
      // Simple approach: add full image, jsPDF handles overflow automatically
      doc.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight, undefined, "FAST");
      
      // Save PDF
      const fileName = `adminai-elemzes-${id?.substring(0, 8) || "unknown"}-${format(new Date(), "yyyy-MM-dd")}.pdf`;
      console.log("Saving PDF:", fileName, "Image dimensions:", imgWidth, "x", imgHeight);
      doc.save(fileName);
      toast.success("PDF letöltve!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Hiba a PDF generálása során");
      
      // Clean up container if error - find by style attribute
      const containers = document.querySelectorAll('[style*="left: -9999px"]');
      containers.forEach(container => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      });
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
    } catch (error) {
      console.error("Share link error:", error);
      toast.error("Hiba a megosztási link létrehozása során");
    }
  };

  // Submit feedback with comment
  const submitFeedbackWithComment = async () => {
    if (!analysis || !id || !feedbackType) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Be kell jelentkezned");
        return;
      }

      // Check if feedback already exists
      const { data: existingFeedback } = await (supabase
        .from("analysis_feedback" as any)
        .select("id")
        .eq("analysis_id", id)
        .eq("user_id", user.id)
        .single()) as { data: { id: string } | null };

      if (existingFeedback) {
        // Update existing feedback
        const { error } = await (supabase
          .from("analysis_feedback" as any)
          .update({
            feedback_type: feedbackType,
            summary_type: activeTab,
            comment: comment || null,
          })
          .eq("id", existingFeedback.id));

        if (error) throw error;
      } else {
        // Insert new feedback
        const { error } = await (supabase.from("analysis_feedback" as any).insert({
          analysis_id: id,
          user_id: user.id,
          feedback_type: feedbackType,
          summary_type: activeTab,
          comment: comment || null,
        }));

        if (error) throw error;
      }

      setFeedbackGiven(true);
      toast.success("Köszönjük a visszajelzést!");
      setShowCommentDialog(false);
      setComment("");
    } catch (error: any) {
      console.error("Feedback error:", error);
      toast.error("Hiba a visszajelzés küldése során");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4" />
          <p className="text-muted-foreground">Betöltés...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Elemzés nem található</CardTitle>
            <CardDescription>A keresett elemzés nem létezik vagy még feldolgozás alatt áll</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/archive")} className="w-full">
              Vissza az archívumhoz
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

  // Calculate todo progress percentage
  const todoProgressPercentage = todoSimple.length > 0
    ? Math.round((Object.values(todoProgress).filter(Boolean).length / todoSimple.length) * 100)
    : 0;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-4xl space-y-6">
        <Button variant="ghost" onClick={() => navigate("/archive")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Vissza az archívumhoz
        </Button>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2 sm:gap-4">
              <div className="space-y-2 min-w-0">
                <CardTitle className="text-xl sm:text-2xl">Elemzés eredménye</CardTitle>
                <CardDescription>A dokumentum részletes elemzése és teendők</CardDescription>
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
                <h3 className="text-lg font-semibold break-words">Miről szól ez a dokumentum?</h3>
                <HelpTooltip 
                  content="Az 'Egyszerű magyarázat' mindennapi nyelven, példákkal segít megérteni. A 'Részletes magyarázat' professzionális, pontosabb értelmezés."
                  helpPageAnchor="eredmenyek"
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
                      <span className="hidden sm:inline">Egyszerű magyarázat</span>
                      <span className="sm:hidden">Egyszerű</span>
                    </TabsTrigger>
                    <TabsTrigger value="legal" className="min-h-[44px] touch-manipulation whitespace-normal text-center text-xs sm:text-sm px-2 py-2">
                      <span className="hidden sm:inline">Részletes magyarázat</span>
                      <span className="sm:hidden">Részletes</span>
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
                  <span className="text-sm text-muted-foreground">Hasznos volt ez az információ?</span>
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
                            <span>Köszönjük a visszajelzést!</span>
                          </>
                        )}
                        {feedbackType === "not_helpful" && (
                          <>
                            <ThumbsDown className="h-4 w-4 text-red-600" />
                            <span>Köszönjük a visszajelzést!</span>
                          </>
                        )}
                        {feedbackType === "confusing" && (
                          <>
                            <MessageSquare className="h-4 w-4 text-orange-600" />
                            <span>Köszönjük a visszajelzést!</span>
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
                  <DialogTitle>Visszajelzés</DialogTitle>
                  <DialogDescription>
                    {feedbackType === "not_helpful" && "Miért nem volt hasznos ez az információ?"}
                    {feedbackType === "confusing" && "Mi volt zavaros? Hogyan tehetnénk érthetőbbé?"}
                  </DialogDescription>
                </DialogHeader>
                <Textarea
                  placeholder="Írja le a visszajelzését..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowCommentDialog(false);
                    setComment("");
                  }}>
                    Mégse
                  </Button>
                  <Button onClick={submitFeedbackWithComment}>
                    Küldés
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Todo Section - Only Simple Steps */}
            <div className="border-t pt-6 space-y-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">Mit kell tennie?</h3>
                  <HelpTooltip 
                    content="Jelölje be a lépéseket, ahogy halad. A haladás százalékos mutatóval követhető."
                    helpPageAnchor="eredmenyek"
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
                <p className="text-muted-foreground">Nincs teendő lista</p>
              )}
            </div>

            {requiredForms.length > 0 && (
              <div className="border-t pt-6 space-y-3">
                <h3 className="text-lg font-semibold">Szükséges nyomtatványok</h3>
                <div className="space-y-4">
                  {requiredForms.map((formItem) => (
                    <FormCard key={formItem.id} form={formItem} />
                  ))}
                </div>
              </div>
            )}

            {paymentReliefForms.length > 0 && (
              <div className="border-t pt-6 space-y-3">
                <h3 className="text-lg font-semibold">Részletfizetés vagy fizetési könnyítés – nyomtatványok</h3>
                <p className="text-sm text-muted-foreground">
                  A dokumentum alapján érdemes megfontolni az Átvezetési kérelmet vagy a Fizetési könnyítés iránti kérelmet. Letöltheti a nyomtatványokat a NAV oldaláról.
                </p>
                <div className="space-y-4">
                  {paymentReliefForms.map((formItem) => (
                    <FormCard key={formItem.id} form={formItem} />
                  ))}
                </div>
              </div>
            )}

            {form && (
              <div className="border-t pt-6 space-y-3">
                <h3 className="text-lg font-semibold">Szükséges hivatalos űrlap</h3>
                <FormCard form={form} />
              </div>
            )}

            {analysis.deadline && (
              <div className="border-t pt-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Határidő</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(analysis.deadline), "yyyy. MMMM d.", { locale: hu })}
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
PRODID:-//AdminAI//Deadline Reminder//EN
BEGIN:VEVENT
UID:${id}@adminai.hu
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(deadlineDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Határidő: ${analysis.simple_summary?.substring(0, 50) || "Dokumentum határidője"}
DESCRIPTION:Dokumentum határidője\\nAdminAI - ${window.location.origin}/result/${id}
LOCATION:AdminAI
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;
                      
                      const blob = new Blob([icalContent], { type: "text/calendar" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `hatarido-${format(deadlineDate, "yyyy-MM-dd")}.ics`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                      URL.revokeObjectURL(url);
                      toast.success("Naptár esemény letöltve!");
                    }}
                  >
                    <CalendarDays className="h-4 w-4 mr-2" />
                    Naptárhoz hozzáadás
                  </Button>
                </div>
              </div>
            )}

            {/* Fizetési adatok csak akkor jelenik meg, ha van bankszámlaszám VAGY összeg (ténylegesen van fizetési kötelezettség) */}
            {(analysis.bank_account || analysis.amount) && (
              <div className="border-t pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Fizetési adatok</h3>
                  <HelpTooltip 
                    content="Ha kézzel írott számokat talált a dokumentumban és az AI nem ismerte fel helyesen, javíthatja az értékeket. Ez segít az AI tanulásában."
                    helpPageAnchor="eredmenyek"
                  />
                </div>
                
                {/* Kedvezményezett csak akkor jelenik meg, ha van fizetési adat is mellette */}
                {analysis.recipient_name && (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground">Kedvezményezett</p>
                      <p className="font-mono">{analysis.recipient_name}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(analysis.recipient_name!);
                        toast.success("Kimásolva!");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {analysis.bank_account && (
                  <OCRCorrectionDialog
                    label="Bankszámlaszám"
                    extractedValue={analysis.bank_account}
                    analysisId={analysis.id || id || ""}
                    documentId={analysis.document_id || ""}
                    fieldType="bank_account"
                  />
                )}

                {analysis.amount && (
                  <OCRCorrectionDialog
                    label="Összeg"
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
            Új dokumentum feltöltése
          </Button>
          <Button onClick={() => navigate("/archive")} variant="outline" className="flex-1 min-h-[44px] touch-manipulation">
            Archívum megtekintése
          </Button>
        </div>
          
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
            <Button onClick={exportAsPDF} variant="outline" size="sm" className="min-h-[44px] touch-manipulation w-full sm:w-auto">
              <FileDown className="h-4 w-4 mr-2" />
              Exportálás PDF-ként
            </Button>
            <Button
              type="button"
              onClick={() => navigate("/archive#export-konyvelo")}
              variant="outline"
              size="sm"
              className="min-h-[44px] touch-manipulation w-full sm:w-auto"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              CSV / Excel könyvelőnek
            </Button>
            <Button onClick={generateShareLink} variant="outline" size="sm" className="min-h-[44px] touch-manipulation w-full sm:w-auto">
              <Share2 className="h-4 w-4 mr-2" />
              Megosztás
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center sm:text-left">
            A könyvelőnek szánt táblázatot az archívumban állíthatod össze (szűrés, dátum, összeg, határidő).
          </p>
        </div>

        {/* Share Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Megosztási link</DialogTitle>
              <DialogDescription>
                Másolja ki ezt a linket, hogy megossza az elemzést másokkal
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
                  toast.success("Link másolva!");
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

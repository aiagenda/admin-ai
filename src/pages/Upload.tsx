import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload as UploadIcon, Loader2, X, FileText, Camera } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { UsageLimit } from "@/components/UsageLimit";
import { LegalQuickLinks } from "@/components/LegalQuickLinks";
import { PageSEO } from "@/components/PageSEO";
import { useTranslation } from "react-i18next";
import { isUsMarket } from "@/lib/market";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import posthog from "posthog-js";

function sanitizeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-.]/g, "");
}

function formatFileSize(bytes: number) {
  if (!bytes) return "0 KB";
  const mb = bytes / (1024 * 1024);
  if (mb >= 0.1) return `${mb.toFixed(2)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}


function getProcessingMessage(status: string, elapsedSec: number, t: (k: string, t) => string) {
  if (status === "completed") return t("uploadPage.processingRedirect");
  if (status !== "processing") return t("uploadPage.processingError");

  if (elapsedSec >= 60) {
    return t("uploadPage.processingWait");
  }
  if (elapsedSec >= 30) {
    return t("uploadPage.processingSoon");
  }
  if (elapsedSec >= 10) {
    return t("uploadPage.processingSoon");
  }
  return t("uploadPage.subtitle");
}

/**
 * Optimize image: resize to max 1920x1080, compress to quality 0.8
 */
async function optimizeImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions (max 1920x1080, maintain aspect ratio)
        const maxWidth = 1920;
        const maxHeight = 1080;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob with quality 0.8
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Could not create blob"));
              return;
            }
            // Create new File with original name
            const baseName = file.name.replace(/\.[^/.]+$/, "");
            const normalizedName = `${baseName || "photo"}.jpg`;
            const optimizedFile = new File([blob], normalizedName, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          "image/jpeg",
          0.8
        );
      };
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export default function Upload() {
  const { t } = useTranslation("common");
  const us = isUsMarket();
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [processingElapsedSec, setProcessingElapsedSec] = useState(0);
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // LOG
  useEffect(() => {
    const fnBase =
      import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
    console.log("✅ FUNCTION URL:", `${fnBase}/analyze-document`);
  }, []);

  useEffect(() => {
    if (!processingDocId || processingStatus !== "processing") {
      setProcessingElapsedSec(0);
      return;
    }

    const startedAt = Date.now();
    setProcessingElapsedSec(0);

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      setProcessingElapsedSec(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [processingDocId, processingStatus]);

  const handleFileSelect = async (selectedFiles: File | File[]) => {
    const fileArray = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];

    if (fileArray.length === 0) return;

    const nonEmptyFiles = fileArray.filter((f) => f.size > 0);
    if (nonEmptyFiles.length === 0) {
      toast.error(t("uploadPage.emptyFile"));
      return;
    }

    // Safari / iOS esetén előfordulhat hiányzó MIME type, ezért az extension is számít.
    const validFiles = nonEmptyFiles.filter((f) => {
      const lowerName = f.name.toLowerCase();
      const isPDF = f.type === "application/pdf" || lowerName.endsWith(".pdf");
      const isImage = f.type.startsWith("image/") || /\.(jpg|jpeg|png|heic|heif|webp)$/i.test(lowerName);
      const inSizeLimit = f.size <= 20 * 1024 * 1024;
      return (isPDF || isImage) && inSizeLimit;
    });

    if (validFiles.length === 0) {
      toast.error(t("uploadPage.fileTypeError"));
      return;
    }

    if (validFiles.length < fileArray.length) {
      toast.warning(`${fileArray.length - validFiles.length} file(s) not supported or too large`);
    }

    let firstFile = validFiles[0];

    const isImageFile = firstFile.type.startsWith("image/") || /\.(jpg|jpeg|png|heic|heif|webp)$/i.test(firstFile.name.toLowerCase());
    if (isImageFile) {
      try {
        firstFile = await optimizeImage(firstFile);
        if (firstFile.size === 0) {
          toast.error("The camera returned an empty image. Please take a new photo.");
          return;
        }
      } catch (error) {
        console.error("Image optimization failed:", error);
        const name = firstFile.name.toLowerCase();
        const isHeic = firstFile.type.includes("heic") || firstFile.type.includes("heif") || /\.(heic|heif)$/i.test(name);
        if (isHeic) {
          toast.error("HEIC conversion failed. Please use a JPG or PNG file instead.");
          return;
        }
        toast.warning(t("uploadPage.imageOptimizeWarn"));
      }
    }

    if (firstFile.size < 1024) {
      toast.error("File is too small or corrupted. Please take a new photo.");
      return;
    }

    if (filePreview && filePreview.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview);
    }

    setFile(firstFile);
    setFilePreview(URL.createObjectURL(firstFile));
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    handleFileSelect(droppedFiles);
  };

  const clearFile = () => {
    setFile(null);
    if (filePreview && filePreview.startsWith("blob:")) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  const handleSubmit = async () => {
    if (!user || !session?.access_token) {
      toast.error(t("uploadPage.signInRequired"));
      return;
    }
    if (!file) {
      toast.error(t("uploadPage.selectFile"));
      return;
    }
    if (file.size === 0) {
      toast.error(t("uploadPage.emptyFile"));
      return;
    }
    if (file.size < 1024) {
      toast.error("File is too small or corrupted. Please choose another document.");
      return;
    }

    // Check quota before upload (only if function exists)
    try {
      const { data: quotaData, error: quotaError } = await supabase.rpc("can_user_upload", {
        _user_id: user.id,
      });

      if (quotaError) {
        // If function doesn't exist (migration not run), skip quota check
        if (quotaError.code === "PGRST202" || quotaError.message?.includes("Could not find the function")) {
          console.warn("Quota check function not available. Skipping quota check.");
          // Continue with upload
        } else {
          console.error("Quota check error:", quotaError);
          // Continue anyway, but log the error
        }
      } else if (quotaData && quotaData.length > 0 && !quotaData[0].can_upload) {
        const quota = quotaData[0];
        toast.error(
          `Elérte a havi kvóta limitjét (${quota.current_usage}/${quota.limit_amount}). Kérjük, frissítse előfizetését.`,
          {
            action: {
              label: t("uploadPage.subscribeLabel"),
              onClick: () => window.location.href = "/pricing",
            },
          }
        );
        return;
      }
    } catch (quotaErr) {
      const e = quotaErr as { code?: string; message?: string };
      // If function doesn't exist, skip quota check
      if (e.code !== "PGRST202" && !e.message?.includes("Could not find the function")) {
        console.error("Quota check failed:", quotaErr);
      }
      // Continue anyway
    }

    setLoading(true);
    try {
      const clean = sanitizeFilename(file.name);
      const path = `${user.id}/${Date.now()}_${clean}`;

      // Determine content type based on file type
      const contentType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      // 1. Upload storage
      const up = await supabase.storage.from("documents").upload(path, file, {
        contentType: contentType,
      });
      if (up.error) throw up.error;

      // 2. DB insert
      const { data: doc, error: insErr } = await supabase
        .from("documents")
        .insert({
          user_id: user.id,
          filename: clean,
          file_url: path,
          upload_date: new Date().toISOString(),
          status: "processing",
        })
        .select()
        .single();

      if (insErr || !doc) throw insErr;

      posthog.capture("document uploaded", {
        document_id: doc.id,
        file_type: contentType,
        file_size_bytes: file.size,
        market: isUsMarket() ? "us" : "hu",
      });

      // 2.5. Increment usage counter (only if function exists)
      try {
        await supabase.rpc("increment_user_usage", {
          _user_id: user.id,
        });
      } catch (usageErr) {
        const e = usageErr as { code?: string; message?: string };
        // If function doesn't exist (migration not run), silently skip
        if (e.code === "PGRST202" || e.message?.includes("Could not find the function")) {
          console.warn("Usage tracking function not available. Skipping usage increment.");
        } else {
          console.error("Usage tracking error:", usageErr);
        }
        // Don't block upload if usage tracking fails
      }

      // 3. CALL EDGE FUNCTION
      const fnBase =
        import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      const fnURL = `${fnBase}/analyze-document`;

      // Call Edge Function (don't wait for completion - it runs async)
      fetch(fnURL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          document_id: doc.id,
          file_url: path,
        }),
      })
        .then(async (res) => {
          const result = await res.json();
          if (!res.ok || !result?.success) {
            console.error("Edge Function error:", result);
            const details = result?.error || result?.message || t("uploadPage.unknownBackend");
            toast.error(`Analysis error: ${details}`);
            // Don't throw here - let polling handle status updates
            // The Edge Function will update status to "error" if it fails
          }
        })
        .catch((err) => {
          console.error("Failed to call Edge Function:", err);
          // Update status to error manually
          supabase
            .from("documents")
            .update({ status: "error" })
            .eq("id", doc.id)
            .then(() => {
              toast.error("Failed to start analysis. Please try again.");
              setProcessingDocId(null);
              setProcessingStatus("");
              setProcessingElapsedSec(0);
            });
        });

      // Set processing state and subscribe to status updates
      setProcessingDocId(doc.id);
      setProcessingStatus("processing");
      // Keep file + preview visible during processing

      // Polling function as fallback (more reliable than realtime)
      let pollCount = 0;
      const maxPolls = 60; // 60 polls = 2 minutes (2 second intervals)
      
      const checkStatus = async () => {
        try {
          // Check document status
          const { data: docData, error: docError } = await supabase
            .from("documents")
            .select("status")
            .eq("id", doc.id)
            .single();

          if (!docError && docData) {
            const currentStatus = docData.status;
            setProcessingStatus(currentStatus);

            if (currentStatus === "completed") {
              // Check for analysis
              const { data: analysisData, error: analysisError } = await supabase
                .from("analyses")
                .select("id")
                .eq("document_id", doc.id)
                .single();

              if (!analysisError && analysisData) {
                posthog.capture("document analysis completed", {
                  document_id: doc.id,
                  analysis_id: analysisData.id,
                });
                toast.success(t("uploadPage.analysisCompleteToast"));
                navigate(`/result/${analysisData.id}`);
                return true; // Stop polling
              }
            } else if (currentStatus === "error") {
              posthog.capture("document analysis failed", { document_id: doc.id });
              toast.error(t("uploadPage.analysisErrorToast"));
              setProcessingDocId(null);
              setProcessingStatus("");
              setProcessingElapsedSec(0);
              return true; // Stop polling
            }
          }

          // Continue polling if still processing
          pollCount++;
          if (pollCount >= maxPolls) {
            toast.error(t("uploadPage.analysisTimeoutToast"));
            setProcessingDocId(null);
            setProcessingStatus("");
            setProcessingElapsedSec(0);
            return true; // Stop polling
          }

          return false; // Continue polling
        } catch (error) {
          console.error("Status check error:", error);
          return false; // Continue polling on error
        }
      };

      // Start polling every 2 seconds
      const pollInterval = setInterval(async () => {
        const shouldStop = await checkStatus();
        if (shouldStop) {
          clearInterval(pollInterval);
        }
      }, 2000);

      // Also try realtime subscription (as backup)
      try {
        const channel = supabase
          .channel(`document-${doc.id}`)
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "documents",
              filter: `id=eq.${doc.id}`,
            },
            (payload) => {
              const newStatus = payload.new.status as string;
              setProcessingStatus(newStatus);

              if (newStatus === "completed") {
                clearInterval(pollInterval); // Stop polling
                supabase
                  .from("analyses")
                  .select("id")
                  .eq("document_id", doc.id)
                  .single()
                  .then(({ data: analysisData }) => {
                    if (analysisData) {
                      toast.success(t("uploadPage.analysisCompleteToast"));
                      navigate(`/result/${analysisData.id}`);
                    }
                  });
              } else if (newStatus === "error") {
                clearInterval(pollInterval); // Stop polling
                toast.error(t("uploadPage.analysisErrorToast"));
                setProcessingDocId(null);
                setProcessingStatus("");
                setProcessingElapsedSec(0);
              }
            }
          )
          .subscribe();

        // Cleanup after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          supabase.removeChannel(channel);
        }, 5 * 60 * 1000);
      } catch (realtimeError) {
        console.warn("Realtime subscription failed, using polling only:", realtimeError);
        // Polling will continue as fallback
      }
    } catch (err) {
      posthog.captureException(err instanceof Error ? err : new Error(String(err)));
      console.error("UPLOAD ERROR:", err);
      toast.error((err as Error)?.message || t("uploadPage.genericError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-6 sm:py-8 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <PageSEO pageKey="upload" path="/upload" noindex />
      <div className="container mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 via-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/25">
              <UploadIcon className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold">{t("uploadPage.title")}</h1>
            <HelpTooltip 
              content={t("uploadPage.tooltipHelp")}
            />
          </div>
          <p className="text-muted-foreground">{t("uploadPage.subtitle")}</p>
        </div>

        {/* Usage Limit Widget */}
        <UsageLimit />

        {/* Upload Card */}
        <Card className="shadow-md sm:shadow-lg border-0 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500/5 via-primary/5 to-purple-500/5">
            <CardContent className="p-6">
              {filePreview ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 rounded-xl bg-white dark:bg-slate-900 border">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="h-12 w-12 shrink-0 rounded-xl bg-gradient-to-br from-blue-500/20 to-primary/20 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate" title={file?.name}>{file?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file?.size || 0)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearFile} className="hover:bg-red-100 hover:text-red-600">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="border-2 border-dashed rounded-xl overflow-hidden bg-white dark:bg-slate-900">
                    {file?.type === "application/pdf" ? (
                      <iframe
                        src={filePreview}
                        className="w-full min-h-[200px] max-h-[50vh] sm:max-h-[400px]"
                        title="PDF Preview"
                      />
                    ) : filePreview ? (
                      <img
                        src={filePreview}
                        alt={t("uploadPage.previewAlt")}
                        className="w-full h-auto max-h-[50vh] sm:max-h-[400px] object-contain mx-auto"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div className="hidden flex-col items-center justify-center py-12 text-muted-foreground">
                      <FileText className="h-16 w-16 mb-2" />
                      <p>{t("uploadPage.previewUnavailable")}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    {t("uploadPage.previewCheck")}
                  </p>
                </div>
              ) : (
              <>
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleFileDrop}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 sm:p-12 text-center outline-none bg-white dark:bg-slate-900",
                  "hover:border-primary hover:bg-primary/5 focus-visible:border-primary transition-all cursor-pointer",
              )}
              >
                <div className="h-16 w-16 mx-auto rounded-2xl bg-gradient-to-br from-blue-500/20 to-primary/20 flex items-center justify-center mb-4">
                  <UploadIcon className="h-8 w-8 text-primary" />
                </div>
                <p className="text-lg font-medium mb-2">{t("uploadPage.dropTitle")}</p>
                <p className="text-muted-foreground mb-4">{t("uploadPage.dropHint")}</p>
                <p className="text-sm text-muted-foreground">{t("uploadPage.formats")}</p>
                <input
                  type="file"
                  accept="application/pdf,image/*,.heic,.heif"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const selectedFiles = e.target.files;
                    if (!selectedFiles || selectedFiles.length === 0) return;
                    handleFileSelect(Array.from(selectedFiles));
                  }}
                />
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full min-h-[44px] touch-manipulation"
                >
                  <FileText className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{t("uploadPage.selectFile")}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    if (fileInputRef.current) {
                      fileInputRef.current.setAttribute("capture", "environment");
                      fileInputRef.current.click();
                      setTimeout(() => {
                        if (fileInputRef.current) {
                          fileInputRef.current.removeAttribute("capture");
                        }
                      }, 100);
                    }
                  }}
                  className="w-full text-muted-foreground min-h-[44px] touch-manipulation"
                >
                  <Camera className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{t("uploadPage.quickPhoto")}</span>
                </Button>
              </div>
              </>
              )}

              {processingDocId && processingStatus ? (
                <div className="mt-6 p-5 rounded-xl bg-gradient-to-r from-blue-500/10 via-primary/10 to-purple-500/10 border border-primary/20">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">
                        {processingStatus === "completed" ? `✓ ${t("uploadPage.processingDone")}` : t("uploadPage.processing")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {getProcessingMessage(processingStatus, processingElapsedSec, t)}
                      </p>
                      {processingStatus === "processing" && processingElapsedSec >= 10 && (
                        <p className="text-xs text-muted-foreground/80 mt-1">{t("uploadPage.elapsed", { sec: processingElapsedSec })}</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <Button 
                    className="w-full mt-6 h-12 text-base bg-gradient-to-r from-blue-600 to-primary hover:from-blue-700 hover:to-primary/90 shadow-lg shadow-primary/25" 
                    onClick={handleSubmit} 
                    disabled={loading || !file}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> {t("uploadPage.uploading")}
                      </>
                    ) : (
                      <>
                        <UploadIcon className="mr-2 h-5 w-5" /> {t("uploadPage.startAnalysis")}
                      </>
                    )}
                  </Button>
                  <p className="mt-3 text-xs text-center text-muted-foreground">
                    {t("uploadPage.consentPrefix")}{" "}
                    <Link className="underline text-primary" to="/legal/privacy">{t("legalLinks.privacy")}</Link>
                    {" "}{t("uploadPage.consentAnd")}{" "}
                    <Link className="underline text-primary" to="/legal/terms">{t("legalLinks.terms")}</Link>.
                  </p>
                </>
              )}

              <div className="mt-6 rounded-xl border bg-muted/30 p-4 space-y-3">
                <p className="text-sm">
                  {t("uploadPage.securityNote")}
                </p>
                <LegalQuickLinks />
              </div>
            </CardContent>
          </div>
        </Card>
      </div>
    </div>
  );
}

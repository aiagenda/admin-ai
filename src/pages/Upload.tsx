import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload as UploadIcon, Loader2, X, FileText, Camera } from "lucide-react";
import { HelpTooltip } from "@/components/HelpTooltip";
import { UsageLimit } from "@/components/UsageLimit";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

function sanitizeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-.]/g, "");
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
            const optimizedFile = new File([blob], file.name, {
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
  const [file, setFile] = useState<File | null>(null);
  const [files, setFiles] = useState<File[]>([]); // Multiple files support
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string>("");
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

  const handleFileSelect = async (selectedFiles: File | File[]) => {
    const fileArray = Array.isArray(selectedFiles) ? selectedFiles : [selectedFiles];
    
    // Validate file types
    const validFiles = fileArray.filter(f => {
      const isPDF = f.type === "application/pdf";
      const isImage = f.type.startsWith("image/");
      return isPDF || isImage;
    });

    if (validFiles.length === 0) {
      toast.error("Csak PDF vagy kép (JPG, PNG, HEIC) tölthető fel");
      return;
    }

    if (validFiles.length < fileArray.length) {
      toast.warning(`${fileArray.length - validFiles.length} fájl nem támogatott formátumú`);
    }

    // For now, handle single file (we'll extend to multiple later)
    let firstFile = validFiles[0];
    
    // Optimize image if it's an image file
    if (firstFile.type.startsWith("image/")) {
      try {
        firstFile = await optimizeImage(firstFile);
        toast.success("Kép optimalizálva");
      } catch (error) {
        console.error("Image optimization failed:", error);
        toast.warning("Kép optimalizálás sikertelen, eredeti fájl használata");
      }
    }
    
    setFile(firstFile);
    setFiles(validFiles);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result;
      if (result) {
        setFilePreview(result as string);
      }
    };
    reader.readAsDataURL(firstFile);
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    handleFileSelect(droppedFiles);
  };

  const clearFile = () => {
    setFile(null);
    setFiles([]);
    if (filePreview) {
      URL.revokeObjectURL(filePreview);
    }
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  const handleSubmit = async () => {
    if (!user || !session?.access_token) {
      toast.error("Jelentkezz be");
      return;
    }
    if (!file) {
      toast.error("Válassz fájlt");
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
              label: "Előfizetés",
              onClick: () => window.location.href = "/pricing",
            },
          }
        );
        return;
      }
    } catch (quotaErr: any) {
      // If function doesn't exist, skip quota check
      if (quotaErr.code !== "PGRST202" && !quotaErr.message?.includes("Could not find the function")) {
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

      // 2.5. Increment usage counter (only if function exists)
      try {
        await supabase.rpc("increment_user_usage", {
          _user_id: user.id,
        });
      } catch (usageErr: any) {
        // If function doesn't exist (migration not run), silently skip
        if (usageErr.code === "PGRST202" || usageErr.message?.includes("Could not find the function")) {
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
            // Don't throw here - let polling handle status updates
            // The Edge Function will update status to "error" if it fails
          } else {
            console.log("Edge Function started successfully:", result);
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
              toast.error("Nem sikerült elindítani az elemzést");
              setProcessingDocId(null);
              setProcessingStatus("");
            });
        });

      // Set processing state and subscribe to status updates
      setProcessingDocId(doc.id);
      setProcessingStatus("processing");
      setFile(null); // Clear file selection

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
                toast.success("Elemzés befejezve!");
                navigate(`/result/${analysisData.id}`);
                return true; // Stop polling
              }
            } else if (currentStatus === "error") {
              toast.error("Hiba történt az elemzés során");
              setProcessingDocId(null);
              setProcessingStatus("");
              return true; // Stop polling
            }
          }

          // Continue polling if still processing
          pollCount++;
          if (pollCount >= maxPolls) {
            toast.error("Az elemzés túl sokáig tart. Kérjük, ellenőrizze az archívumot később.");
            setProcessingDocId(null);
            setProcessingStatus("");
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
                      toast.success("Elemzés befejezve!");
                      navigate(`/result/${analysisData.id}`);
                    }
                  });
              } else if (newStatus === "error") {
                clearInterval(pollInterval); // Stop polling
                toast.error("Hiba történt az elemzés során");
                setProcessingDocId(null);
                setProcessingStatus("");
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
    } catch (err: any) {
      console.error("UPLOAD ERROR:", err);
      toast.error(err.message || "Hiba történt");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="container mx-auto max-w-3xl space-y-4">
        {/* Usage Limit Widget */}
        <UsageLimit />

        <Card className="shadow-md">
          <CardHeader>
            <div className="flex items-center justify-center gap-2">
            <CardTitle className="text-2xl font-bold text-center">Dokumentum feltöltése</CardTitle>
              <HelpTooltip 
                content="Töltsön fel PDF dokumentumot vagy képet (JPG, PNG, HEIC). Az elemzés általában 30-60 másodpercig tart. Mobil eszközön kamerával is fényképezhet."
                helpPageAnchor="feltoltes"
              />
            </div>
            <CardDescription className="text-center">Tölts fel PDF-et vagy képet elemzéshez</CardDescription>
          </CardHeader>

          <CardContent>
            {filePreview ? (
              <Card className="border-2 border-dashed">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-primary" />
                      <div>
                        <p className="font-medium">{file?.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(file?.size || 0) / 1024 / 1024} MB
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={clearFile}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden bg-muted/50">
                    {file?.type === "application/pdf" ? (
                      <iframe
                        src={filePreview}
                        className="w-full h-[500px]"
                        title="PDF Preview"
                      />
                    ) : (
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="w-full h-auto max-h-[500px] object-contain mx-auto"
                      />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2 text-center">
                    {file?.type === "application/pdf" ? "PDF" : "Kép"} előnézet - Ellenőrizze, hogy ez a megfelelő dokumentum
                  </p>
                </CardContent>
              </Card>
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
                "border-2 border-dashed rounded-lg p-10 text-center outline-none",
                "hover:border-blue-500 focus-visible:border-blue-500 transition cursor-pointer",
              )}
            >
              <UploadIcon className="mx-auto h-10 w-10 text-gray-500 mb-3" />
              {file ? (
                <p className="font-medium">{file.name}</p>
              ) : (
                <p className="text-gray-500">Húzd ide a PDF-et vagy képet, vagy kattints</p>
              )}
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png,image/heic"
                ref={fileInputRef}
                className="hidden"
                onChange={(e) => {
                  const selectedFiles = e.target.files;
                  if (!selectedFiles || selectedFiles.length === 0) return;
                  handleFileSelect(Array.from(selectedFiles));
                }}
              />
            </div>
            <div className="mt-4 flex gap-2 justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  // Set capture attribute for camera
                  if (fileInputRef.current) {
                    fileInputRef.current.setAttribute("capture", "environment");
                    fileInputRef.current.click();
                    // Reset capture after click
                    setTimeout(() => {
                      if (fileInputRef.current) {
                        fileInputRef.current.removeAttribute("capture");
                      }
                    }, 100);
                  }
                }}
                className="w-full sm:w-auto"
              >
                <Camera className="mr-2 h-4 w-4" />
                Kamerával fotózás
              </Button>
            </div>
            </>
            )}

            {processingDocId && processingStatus ? (
              <Card className="mt-6 p-4 bg-primary/5">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <div className="flex-1">
                    <p className="font-medium">Dokumentum feldolgozása...</p>
                    <p className="text-sm text-muted-foreground">
                      {processingStatus === "processing"
                        ? "Az AI elemzi a dokumentumot. Ez eltarthat néhány másodpercig."
                        : processingStatus === "completed"
                          ? "Befejezve! Átirányítás..."
                          : "Hiba történt"}
                    </p>
                  </div>
                </div>
              </Card>
            ) : (
              <Button className="w-full mt-6" onClick={handleSubmit} disabled={loading || !file}>
              {loading ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Feltöltés...
                </>
              ) : (
                <>Elemzés indítása</>
              )}
            </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

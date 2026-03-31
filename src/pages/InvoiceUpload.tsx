import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload as UploadIcon, Loader2, X, Receipt, Camera, ArrowLeft, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { DocumentScanner } from "@/components/DocumentScanner";

function sanitizeFilename(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-.]/g, "");
}

async function optimizeImage(file: File): Promise<File> {
  // Skip optimization for files under 3MB - preserve quality
  if (file.size < 3 * 1024 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onerror = () => resolve(file);
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => resolve(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        const maxWidth = 2400;
        const maxHeight = 3200;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            const optimizedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          },
          "image/jpeg",
          0.85
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

type FileStatus = "pending" | "uploading" | "processing" | "completed" | "error";

interface FileItem {
  id: string;
  file: File;
  preview: string | null;
  status: FileStatus;
  invoiceId?: string;
  error?: string;
}

export default function InvoiceUpload() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const validateFile = (file: File): string | null => {
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isImage = file.type.startsWith("image/") || 
      /\.(jpg|jpeg|png|gif|webp|bmp|tiff?)$/i.test(file.name);
    
    const isHEIC = file.type === "image/heic" || 
      file.type === "image/heif" ||
      /\.(heic|heif)$/i.test(file.name);
    
    if (isHEIC) {
      return "HEIC formátum nem támogatott";
    }
    
    if (!isPDF && !isImage) {
      return "Csak PDF vagy kép tölthető fel";
    }

    if (file.size > 20 * 1024 * 1024) {
      return "Maximum 20MB méret";
    }

    return null;
  };

  const handleFilesSelect = async (selectedFiles: FileList | File[]) => {
    const fileArray = Array.from(selectedFiles);
    
    const newFiles: FileItem[] = [];
    
    for (const file of fileArray) {
      const error = validateFile(file);
      
      if (error) {
        toast.error(`${file.name}: ${error}`);
        continue;
      }

      // Optimize images
      let processedFile = file;
      if (file.type.startsWith("image/")) {
        try {
          processedFile = await optimizeImage(file);
        } catch {
          // Use original if optimization fails
        }
      }

      // Create preview
      let preview: string | null = null;
      if (processedFile.type.startsWith("image/")) {
        preview = URL.createObjectURL(processedFile);
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file: processedFile,
        preview,
        status: "pending",
      });
    }

    if (newFiles.length > 0) {
      setFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} fájl hozzáadva`);
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFilesSelect(droppedFiles);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== id);
    });
  };

  const clearAllFiles = () => {
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadSingleFile = async (fileItem: FileItem): Promise<void> => {
    if (!user || !session?.access_token) return;

    // Update status to uploading
    setFiles(prev => prev.map(f => 
      f.id === fileItem.id ? { ...f, status: "uploading" as FileStatus } : f
    ));

    try {
      const clean = sanitizeFilename(fileItem.file.name);
      const path = `invoices/${user.id}/${Date.now()}_${clean}`;
      const contentType = fileItem.file.type || (fileItem.file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

      // Upload to storage
      const up = await supabase.storage.from("documents").upload(path, fileItem.file, {
        contentType,
      });
      if (up.error) throw up.error;

      // Insert invoice record
      const { data: invoice, error: insErr } = await (supabase
        .from("invoices" as any)
        .insert({
          user_id: user.id,
          filename: clean,
          file_url: path,
          upload_date: new Date().toISOString(),
          status: "processing",
        })
        .select()
        .single()) as { data: { id: string } | null; error: any };

      if (insErr || !invoice) throw insErr;

      // Update status to processing
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: "processing" as FileStatus, invoiceId: invoice.id } : f
      ));

      // Call analyze-invoice Edge Function
      const fnBase = import.meta.env.VITE_SUPABASE_FUNCTION_URL ||
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

      const response = await fetch(`${fnBase}/analyze-invoice`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoice_id: invoice.id,
          file_url: path,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "Feldolgozási hiba");
      }

      // Success!
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: "completed" as FileStatus } : f
      ));

    } catch (error: any) {
      console.error("Upload error:", error);
      setFiles(prev => prev.map(f => 
        f.id === fileItem.id ? { ...f, status: "error" as FileStatus, error: error.message } : f
      ));
    }
  };

  const handleSubmit = async () => {
    if (!user || !session?.access_token) {
      toast.error("Jelentkezz be");
      return;
    }

    const pendingFiles = files.filter(f => f.status === "pending");
    if (pendingFiles.length === 0) {
      toast.error("Nincs feltöltendő fájl");
      return;
    }

    // Check access
    try {
      const { data: adminData } = await supabase.rpc('is_admin');
      const isAdmin = adminData === true;

      if (!isAdmin) {
        const { data: subData } = await (supabase
          .from('user_subscriptions' as any)
          .select('plan_type')
          .eq('user_id', user.id)
          .single()) as { data: { plan_type: string } | null };
        
        if (subData?.plan_type !== 'enterprise') {
          toast.error("A Könyvelés modul csak Professzionális előfizetéssel érhető el", {
            action: {
              label: "Előfizetés",
              onClick: () => navigate("/pricing"),
            },
          });
          return;
        }
      }
    } catch (error) {
      console.error("Error checking subscription:", error);
    }

    setIsUploading(true);

    // Upload files sequentially to avoid overwhelming the server
    for (const fileItem of pendingFiles) {
      await uploadSingleFile(fileItem);
    }

    setIsUploading(false);

    const completed = files.filter(f => f.status === "completed").length;
    const errors = files.filter(f => f.status === "error").length;

    if (completed > 0) {
      toast.success(`${completed} számla sikeresen feldolgozva!`);
    }
    if (errors > 0) {
      toast.error(`${errors} számla feldolgozása sikertelen`);
    }
  };

  const completedCount = files.filter(f => f.status === "completed").length;
  const pendingCount = files.filter(f => f.status === "pending").length;
  const processingCount = files.filter(f => f.status === "uploading" || f.status === "processing").length;
  const errorCount = files.filter(f => f.status === "error").length;
  const progress = files.length > 0 ? ((completedCount + errorCount) / files.length) * 100 : 0;

  const getStatusIcon = (status: FileStatus) => {
    switch (status) {
      case "pending":
        return <FileText className="h-5 w-5 text-muted-foreground" />;
      case "uploading":
      case "processing":
        return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "error":
        return <AlertCircle className="h-5 w-5 text-destructive" />;
    }
  };

  const getStatusText = (status: FileStatus) => {
    switch (status) {
      case "pending":
        return "Várakozik";
      case "uploading":
        return "Feltöltés...";
      case "processing":
        return "Feldolgozás...";
      case "completed":
        return "Kész";
      case "error":
        return "Hiba";
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="container mx-auto max-w-3xl">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => navigate("/invoices")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Vissza a számlákhoz
        </Button>

        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Receipt className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Számlák feltöltése</CardTitle>
            </div>
            <CardDescription>
              Töltsd fel számláidat - akár többet is egyszerre. Az AI automatikusan felismeri és kategorizálja őket.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Drop Zone */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleFileDrop}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
                "hover:border-primary hover:bg-primary/5",
                isUploading && "pointer-events-none opacity-50"
              )}
            >
              <UploadIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-2">
                Húzd ide a számlákat vagy kattints
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, JPG, PNG • Maximum 20MB / fájl • Több fájl is kiválasztható
              </p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" disabled={isUploading}>
                  <UploadIcon className="h-4 w-4 mr-2" />
                  Fájlok kiválasztása
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={isUploading}
                  onClick={(e) => {
                    e.stopPropagation();
                    setScannerOpen(true);
                  }}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Kamera szkenner
                </Button>
              </div>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp,image/bmp,image/tiff"
                ref={fileInputRef}
                className="hidden"
                multiple
                onChange={(e) => {
                  if (e.target.files) {
                    handleFilesSelect(e.target.files);
                  }
                }}
              />
              <DocumentScanner
                open={scannerOpen}
                onClose={() => setScannerOpen(false)}
                onCapture={async (scannedFile) => {
                  setScannerOpen(false);
                  await handleFilesSelect([scannedFile]);
                }}
                onCaptureBatch={async (scannedFiles) => {
                  setScannerOpen(false);
                  await handleFilesSelect(scannedFiles);
                }}
                mode="invoice"
                title="Számla szkennelése"
              />
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">
                    Kiválasztott fájlok ({files.length})
                  </h3>
                  {pendingCount > 0 && !isUploading && (
                    <Button variant="ghost" size="sm" onClick={clearAllFiles}>
                      <X className="h-4 w-4 mr-1" />
                      Mind törlése
                    </Button>
                  )}
                </div>

                {/* Progress Bar */}
                {isUploading && (
                  <div className="space-y-2">
                    <Progress value={progress} className="h-2" />
                    <p className="text-sm text-muted-foreground text-center">
                      {completedCount + errorCount} / {files.length} feldolgozva
                    </p>
                  </div>
                )}

                {/* File Items */}
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {files.map((fileItem) => (
                    <div
                      key={fileItem.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border",
                        fileItem.status === "completed" && "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
                        fileItem.status === "error" && "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800"
                      )}
                    >
                      {/* Preview */}
                      <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
                        {fileItem.preview ? (
                          <img
                            src={fileItem.preview}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FileText className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{fileItem.file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                          {fileItem.error && (
                            <span className="text-destructive ml-2">• {fileItem.error}</span>
                          )}
                        </p>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        {getStatusIcon(fileItem.status)}
                        <span className="text-sm text-muted-foreground hidden sm:inline">
                          {getStatusText(fileItem.status)}
                        </span>
                      </div>

                      {/* Remove Button */}
                      {fileItem.status === "pending" && !isUploading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFile(fileItem.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submit Button */}
            {files.length > 0 && (
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmit}
                  disabled={isUploading || pendingCount === 0}
                  className="flex-1"
                  size="lg"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Feldolgozás... ({processingCount} aktív)
                    </>
                  ) : (
                    <>
                      <UploadIcon className="h-5 w-5 mr-2" />
                      {pendingCount} számla feldolgozása
                    </>
                  )}
                </Button>

                {completedCount > 0 && !isUploading && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate("/invoices")}
                  >
                    Megtekintés
                  </Button>
                )}
              </div>
            )}

            {/* Info */}
            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">Mit ismer fel az AI?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Számlaszám, dátum, fizetési határidő</li>
                <li>• Kibocsátó neve, címe, adószáma</li>
                <li>• Nettó, ÁFA és bruttó összeg</li>
                <li>• Tétel megnevezése</li>
                <li>• Automatikus költség kategória</li>
                <li>• Kézzel írt számlák is!</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

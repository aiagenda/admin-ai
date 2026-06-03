import { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/telemetry";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Camera, Scan, Check, Loader2, CheckCircle2, AlertTriangle, Info, Plus, Trash2, ArrowLeft, ArrowRight, Upload } from "lucide-react";

type QualityLevel = "good" | "warning" | "poor";

type QualityAssessment = {
  level: QualityLevel;
  score: number;
  brightness: number;
  blur: number;
  tips: string[];
};

type ScannedPage = {
  url: string;
  quality: QualityAssessment | null;
  poorAcknowledged: boolean;
  crop?: Crop;
};

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number,
): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: 90 },
      aspect,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  );
}

async function getCroppedImage(imageSrc: string, crop: Crop): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2d context");

  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;

  canvas.width = Math.max(1, crop.width * scaleX);
  canvas.height = Math.max(1, crop.height * scaleY);

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/jpeg", 0.92);
  });
}

async function getImageBlob(imageSrc: string): Promise<Blob> {
  const res = await fetch(imageSrc);
  return await res.blob();
}

async function assessImageQuality(imageSrc: string): Promise<QualityAssessment> {
  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const maxW = 640;
  const scale = Math.min(1, maxW / image.naturalWidth);
  const width = Math.max(1, Math.floor(image.naturalWidth * scale));
  const height = Math.max(1, Math.floor(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { level: "warning", score: 70, brightness: 0, blur: 0, tips: ["Could not automatically assess quality."] };
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const { data } = ctx.getImageData(0, 0, width, height);
  const gray = new Float32Array(width * height);
  let sum = 0;

  for (let i = 0, px = 0; i < data.length; i += 4, px++) {
    const g = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[px] = g;
    sum += g;
  }

  const brightness = sum / gray.length;

  let gradSum = 0;
  let gradSqSum = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const gx = gray[idx + 1] - gray[idx - 1];
      const gy = gray[idx + width] - gray[idx - width];
      const mag = Math.sqrt(gx * gx + gy * gy);
      gradSum += mag;
      gradSqSum += mag * mag;
      count++;
    }
  }

  const gradMean = gradSum / Math.max(1, count);
  const blur = Math.sqrt(Math.max(0, gradSqSum / Math.max(1, count) - gradMean * gradMean));

  const tips: string[] = [];
  let score = 100;

  if (brightness < 70) {
    score -= 25;
    tips.push("Image is too dark. Try better lighting.");
  } else if (brightness > 215) {
    score -= 20;
    tips.push("Image is too bright. Avoid direct glare.");
  }

  if (blur < 18) {
    score -= 35;
    tips.push("Image is blurry. Hold your phone steady and refocus.");
  } else if (blur < 26) {
    score -= 15;
    tips.push("Image sharpness can be improved. Consider retaking if it contains important data.");
  }

  if (width < 500 || height < 500) {
    score -= 10;
    tips.push("Low resolution. Try moving closer to the document.");
  }

  score = Math.max(0, Math.min(100, score));
  let level: QualityLevel = "good";
  if (score < 55) level = "poor";
  else if (score < 80) level = "warning";
  if (tips.length === 0) tips.push("Image quality is good for analysis.");

  return { level, score, brightness, blur, tips };
}

export interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  onCaptureBatch?: (files: File[]) => void;
  title?: string;
  mode?: "document" | "invoice";
}

export function DocumentScanner({ open, onClose, onCapture, onCaptureBatch, title, mode = "document" }: DocumentScannerProps) {
  const [step, setStep] = useState<"camera" | "review">("camera");
  const [pages, setPages] = useState<ScannedPage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [crop, setCrop] = useState<Crop>();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assessingQuality, setAssessingQuality] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPage = pages[currentIndex] || null;
  const isPoorQuality = currentPage?.quality?.level === "poor";
  const hasUnacknowledgedPoorPage = pages.some((p) => p.quality?.level === "poor" && !p.poorAcknowledged);
  const canProceed = !!crop?.width && !loading && !hasUnacknowledgedPoorPage;
  const qualitySummary = {
    good: pages.filter((p) => p.quality?.level === "good").length,
    warning: pages.filter((p) => p.quality?.level === "warning").length,
    poor: pages.filter((p) => p.quality?.level === "poor").length,
  };

  const startCamera = useCallback(async () => {
    setCameraError(null);
    trackEvent("scanner_camera_open", { mode });
    try {
      const tryConstraints = [
        { video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
        { video: { facingMode: "environment" }, audio: false },
        { video: true, audio: false },
      ];
      let stream: MediaStream | null = null;
      for (const constraints of tryConstraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch {
          continue;
        }
      }
      if (!stream) throw new Error("No camera");
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.play().catch(() => {});
      }
      setCameraStarted(true);
    } catch (err) {
      const e = err as { message?: string; name?: string };
      setCameraError(
        e?.message?.includes("Permission") || e?.name === "NotAllowedError"
          ? "Camera access denied. Allow it in your browser settings, or use file upload instead."
          : "Camera unavailable (e.g. PWA mode). Use the 'Choose file' option instead.",
      );
      trackEvent("scanner_camera_error", { name: e?.name || "unknown" });
    }
  }, [mode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    if (open) trackEvent("scanner_open", { mode });
  }, [open, mode]);

  useEffect(() => {
    return () => {
      if (!open) stopCamera();
    };
  }, [open, stopCamera]);

  useEffect(() => {
    if (!open) {
      pages.forEach((p) => URL.revokeObjectURL(p.url));
      setStep("camera");
      setPages([]);
      setCurrentIndex(0);
      setCrop(undefined);
      setCameraError(null);
      setCameraStarted(false);
      setAssessingQuality(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const updateCurrentPage = (updater: (page: ScannedPage) => ScannedPage) => {
    setPages((prev) => prev.map((p, idx) => (idx === currentIndex ? updater(p) : p)));
  };

  const appendPageFromBlob = async (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    setAssessingQuality(true);
    let quality: QualityAssessment;
    try {
      quality = await assessImageQuality(url);
    } catch {
      quality = { level: "warning", score: 70, brightness: 0, blur: 0, tips: ["Quality check partially succeeded."] };
    }

    setPages((prev) => {
      const next = [...prev, { url, quality, poorAcknowledged: false }];
      setCurrentIndex(next.length - 1);
      return next;
    });
    setStep("review");
    setCrop(undefined);
    setAssessingQuality(false);

    trackEvent("scanner_capture", { quality: quality.level, score: quality.score });
  };

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      stopCamera();
      setCameraStarted(false);
      await appendPageFromBlob(blob);
    }, "image/jpeg", 0.9);
  };

  const handlePickFile = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(ev.target.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    stopCamera();
    setCameraStarted(false);
    trackEvent("scanner_file_fallback_pick", { count: files.length });

    for (const file of files) {
      await appendPageFromBlob(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const movePage = (direction: -1 | 1) => {
    setPages((prev) => {
      const target = currentIndex + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(currentIndex, 1);
      next.splice(target, 0, item);
      setCurrentIndex(target);
      setCrop(next[target]?.crop);
      trackEvent("scanner_page_reorder", { from: currentIndex, to: target });
      return next;
    });
  };

  const handleCropComplete = useCallback(async () => {
    if (pages.length === 0) return;
    setLoading(true);
    try {
      const files: File[] = [];
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const blob = page.crop?.width && page.crop?.height ? await getCroppedImage(page.url, page.crop) : await getImageBlob(page.url);
        if (!blob || blob.size === 0) continue;
        files.push(new File([blob], `scan_${Date.now()}_${i + 1}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
      }

      if (files.length === 0) {
        setLoading(false);
        return;
      }

      if (files.length > 1 && onCaptureBatch) onCaptureBatch(files);
      else onCapture(files[0]);

      trackEvent("scanner_submit", { pages: files.length, poor: qualitySummary.poor, warning: qualitySummary.warning });
      pages.forEach((p) => URL.revokeObjectURL(p.url));
      onClose();
    } catch (e) {
      console.error(e);
      trackEvent("scanner_submit_error", { message: e instanceof Error ? e.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }, [onCapture, onCaptureBatch, onClose, pages, qualitySummary.poor, qualitySummary.warning]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const nextCrop = currentPage?.crop || centerAspectCrop(width, height, 3 / 4);
    setCrop(nextCrop);
    updateCurrentPage((p) => ({ ...p, crop: nextCrop }));
  };

  const removeCurrentPage = () => {
    if (!currentPage) return;
    URL.revokeObjectURL(currentPage.url);
    setPages((prev) => {
      const next = prev.filter((_, idx) => idx !== currentIndex);
      const nextIndex = Math.max(0, Math.min(currentIndex, next.length - 1));
      setCurrentIndex(nextIndex);
      setCrop(next[nextIndex]?.crop);
      if (next.length === 0) {
        setStep("camera");
        setCameraStarted(false);
      }
      trackEvent("scanner_retake", { remaining: next.length });
      return next;
    });
  };

  const copy = mode === "invoice"
    ? { frame: "Keep the invoice in the frame", capture: "Take photo", crop: "Use pages" }
    : { frame: "Keep the document in the frame", capture: "Take photo", crop: "Use pages" };

  const qualityStyles = {
    good: { border: "border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30", icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, title: "Good quality" },
    warning: { border: "border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30", icon: <Info className="h-4 w-4 text-amber-600" />, title: "Fair quality" },
    poor: { border: "border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-950/30", icon: <AlertTriangle className="h-4 w-4 text-red-600" />, title: "Poor quality" },
  };

  const currentQualityStyle = currentPage?.quality ? qualityStyles[currentPage.quality.level] : qualityStyles.warning;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-2xl overflow-hidden p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            {title || (mode === "invoice" ? "Scan invoice" : "Scan document")}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {mode === "invoice" ? "Take a photo of the invoice or choose a file, then crop." : "Take a photo or choose a file, then crop."}
          </DialogDescription>

          <div className="flex items-center gap-2 pt-2">
            <div className={`h-1.5 flex-1 rounded-full ${step === "camera" ? "bg-primary" : "bg-primary/30"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step === "review" ? "bg-primary" : "bg-primary/30"}`} />
          </div>
          <p className="text-xs text-muted-foreground pt-1">{step === "camera" ? "1/2 Take photo" : "2/2 Review & crop"}</p>
        </DialogHeader>

        {step === "camera" && (
          <div className="relative bg-black">
            {!cameraStarted && !cameraError ? (
              <div className="aspect-[4/3] flex flex-col items-center justify-center text-white p-6 text-center">
                <Camera className="h-12 w-12 mb-4 opacity-70" />
                <p className="font-medium mb-1">Use camera</p>
                <p className="text-sm text-white/70 mb-4">In PWA and mobile browsers the camera starts on tap.</p>
                <div className="flex w-full max-w-sm flex-col gap-2">
                  <Button size="lg" className="gap-2" onClick={startCamera}><Camera className="h-5 w-5" />Start camera</Button>
                  <Button variant="outline" className="gap-2 text-white border-white/40 hover:bg-white/10" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4" /> Choose file
                  </Button>
                </div>
              </div>
            ) : cameraError ? (
              <div className="aspect-[4/3] flex flex-col items-center justify-center text-white p-6 text-center">
                <Camera className="h-12 w-12 mb-2 opacity-50" />
                <p className="font-medium">{cameraError}</p>
                <p className="text-sm text-white/70 mt-1">Use the "Choose file" option to select an image.</p>
                <div className="flex gap-2 mt-4">
                  <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>Choose file</Button>
                  <Button variant="outline" className="text-white border-white/40" onClick={onClose}>Close</Button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover bg-black"
                  onLoadedMetadata={() => videoRef.current?.play().catch(() => {})}
                  onCanPlay={() => videoRef.current?.play().catch(() => {})}
                />

                <div className="absolute inset-0 grid pointer-events-none" style={{ gridTemplateRows: "1fr auto 1fr", gridTemplateColumns: "1fr auto 1fr" }}>
                  <div className="bg-black/55 col-span-3" />
                  <div className="bg-black/55" />
                  <div className="w-[88%] min-w-[200px] max-w-[320px] aspect-[3/4] rounded-2xl border-2 border-white/95 shadow-[0_0_0_1px_rgba(255,255,255,0.3),inset_0_0_20px_rgba(0,0,0,0.15)]" />
                  <div className="bg-black/55" />
                  <div className="bg-black/55 col-span-3" />
                </div>

                <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 text-xs text-white/90">
                  <span className="rounded-full bg-black/50 px-2.5 py-1">Keep all 4 corners visible</span>
                  <span className="rounded-full bg-black/50 px-2.5 py-1">Avoid glare</span>
                  <span className="rounded-full bg-black/50 px-2.5 py-1">Tartsd stabilan a telefont</span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white/90 text-center text-sm mb-3">{copy.frame}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 bg-black/40 border-white/30 text-white hover:bg-black/60" size="lg" onClick={onClose}>Cancel</Button>
                    <Button className="flex-1 gap-2" size="lg" onClick={handleCapture}><Camera className="h-5 w-5" />{copy.capture}</Button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {step === "review" && currentPage && (
          <div className="p-4 space-y-4">
            {assessingQuality ? (
              <div className="rounded-lg border bg-muted/50 p-3 text-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Checking image quality...
              </div>
            ) : (
              <>
                <div className={`rounded-lg border p-3 ${currentQualityStyle.border}`}>
                  <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                    {currentQualityStyle.icon}
                    {currentQualityStyle.title} ({currentPage.quality?.score ?? 0}/100)
                  </div>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                    {(currentPage.quality?.tips || []).map((tip) => <li key={tip}>{tip}</li>)}
                  </ul>
                  {isPoorQuality && !currentPage.poorAcknowledged && (
                    <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" className="sm:flex-1" onClick={removeCurrentPage}>Retake photo</Button>
                      <Button variant="secondary" className="sm:flex-1" onClick={() => {
                        updateCurrentPage((p) => ({ ...p, poorAcknowledged: true }));
                        trackEvent("scanner_override_poor", { page: currentIndex + 1 });
                      }}>
                        Use this anyway
                      </Button>
                    </div>
                  )}
                </div>

                {pages.length > 1 && (
                  <div className="rounded-lg border bg-muted/30 p-2 text-xs text-muted-foreground">
                    Overall quality: {qualitySummary.good} good, {qualitySummary.warning} fair, {qualitySummary.poor} poor
                  </div>
                )}
              </>
            )}

            {pages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {pages.map((p, idx) => (
                  <button
                    key={p.url}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setCrop(p.crop);
                    }}
                    className={`relative h-16 w-12 shrink-0 rounded border-2 overflow-hidden ${idx === currentIndex ? "border-primary" : "border-transparent"}`}
                  >
                    <img src={p.url} alt={`Oldal ${idx + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute bottom-0 right-0 text-[10px] bg-black/70 text-white px-1 rounded-tl">{idx + 1}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="relative max-h-[60vh] overflow-auto rounded-lg bg-muted">
              <ReactCrop
                crop={crop}
                onChange={(_, c) => {
                  setCrop(c);
                  updateCurrentPage((p) => ({ ...p, crop: c }));
                }}
                aspect={3 / 4}
                className="max-w-full"
              >
                <img src={currentPage.url} alt="Captured" onLoad={handleImageLoad} className="max-w-full h-auto block" />
              </ReactCrop>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Button variant="outline" onClick={removeCurrentPage}><Trash2 className="mr-2 h-4 w-4" />Remove page</Button>
              <Button variant="outline" onClick={() => {
                setStep("camera");
                setCameraStarted(false);
                startCamera();
              }}><Plus className="mr-2 h-4 w-4" />Add page</Button>

              <Button variant="outline" disabled={currentIndex === 0} onClick={() => movePage(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Move earlier</Button>
              <Button variant="outline" disabled={currentIndex === pages.length - 1} onClick={() => movePage(1)}>Move later<ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>

            <Button className="w-full gap-2" onClick={handleCropComplete} disabled={!canProceed}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {hasUnacknowledgedPoorPage ? "There is a poor quality page" : copy.crop}
            </Button>

            <p className="text-xs text-muted-foreground text-center">Összes oldal: {pages.length}</p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handlePickFile}
        />
      </DialogContent>
    </Dialog>
  );
}

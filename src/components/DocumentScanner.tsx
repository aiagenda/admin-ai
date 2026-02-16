import { useState, useRef, useEffect, useCallback } from "react";
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, Scan, Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: "%", width: 90 },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

async function getCroppedImage(
  imageSrc: string,
  crop: Crop
): Promise<Blob> {
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

  canvas.width = crop.width * scaleX;
  canvas.height = crop.height * scaleY;

  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/jpeg",
      0.92
    );
  });
}

export interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
  /** Optional: "document" shows NAV/doc wording, "invoice" shows invoice wording */
  mode?: "document" | "invoice";
}

export function DocumentScanner({
  open,
  onClose,
  onCapture,
  title,
  mode = "document",
}: DocumentScannerProps) {
  const [step, setStep] = useState<"camera" | "crop">("camera");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraError(err?.message?.includes("Permission") ? "Kamera hozzáférés megtagadva." : "Kamera nem elérhető.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (open && step === "camera") {
      startCamera();
    }
    return () => {
      if (!open) stopCamera();
    };
  }, [open, step, startCamera, stopCamera]);

  useEffect(() => {
    if (!open) {
      setStep("camera");
      setCapturedUrl(null);
      setCrop(undefined);
      setCameraError(null);
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    }
  }, [open]);

  const handleCapture = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopCamera();
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        setStep("crop");
        setCrop(undefined);
      },
      "image/jpeg",
      0.9
    );
  };

  const handleCropComplete = useCallback(async () => {
    if (!capturedUrl || !crop?.width || !crop?.height) return;
    setLoading(true);
    try {
      const blob = await getCroppedImage(capturedUrl, crop);
      const file = new File([blob], `scan_${Date.now()}.jpg`, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });
      onCapture(file);
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [capturedUrl, crop, onCapture, onClose]);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, 3 / 4));
  };

  const copy = mode === "invoice"
    ? { frame: "Tartsd a számlát a keretben", capture: "Fotó készítése", crop: "Vágás használata" }
    : { frame: "Tartsd a dokumentumot a keretben", capture: "Fotó készítése", crop: "Vágás használata" };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[95vw] md:max-w-2xl overflow-hidden p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            {title || (mode === "invoice" ? "Számla szkennelése" : "Dokumentum szkennelése")}
          </DialogTitle>
        </DialogHeader>

        {step === "camera" && (
          <div className="relative bg-black">
            {cameraError ? (
              <div className="aspect-[4/3] flex flex-col items-center justify-center text-white p-6 text-center">
                <Camera className="h-12 w-12 mb-2 opacity-50" />
                <p className="font-medium">{cameraError}</p>
                <p className="text-sm text-white/70 mt-1">Használd a „Fájl kiválasztása” lehetőséget, és válassz egy képet.</p>
                <Button variant="secondary" className="mt-4" onClick={onClose}>
                  Bezárás
                </Button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-[85%] max-w-sm aspect-[3/4] border-2 border-white/80 rounded-xl shadow-lg" />
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white/90 text-center text-sm mb-3">{copy.frame}</p>
                  <Button className="w-full gap-2" size="lg" onClick={handleCapture}>
                    <Camera className="h-5 w-5" />
                    {copy.capture}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {step === "crop" && capturedUrl && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Igazítsd a keretet a dokumentumhoz, majd használd a képet.
            </p>
            <div className="relative max-h-[60vh] overflow-auto rounded-lg bg-muted">
              <ReactCrop
                crop={crop}
                onChange={(_, c) => setCrop(c)}
                aspect={3 / 4}
                className="max-w-full"
              >
                <img
                  ref={imgRef}
                  src={capturedUrl}
                  alt="Captured"
                  onLoad={handleImageLoad}
                  className="max-w-full h-auto block"
                />
              </ReactCrop>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                className="w-full sm:flex-1"
                onClick={() => {
                  if (capturedUrl) URL.revokeObjectURL(capturedUrl);
                  setCapturedUrl(null);
                  setStep("camera");
                  startCamera();
                }}
              >
                <X className="mr-2 h-4 w-4" />
                Újra
              </Button>
              <Button
                className="w-full sm:flex-1 gap-2"
                onClick={handleCropComplete}
                disabled={!crop?.width || loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {copy.crop}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

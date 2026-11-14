import { useI18n } from "@/i18n";
import { useEffect, useRef, useState, useCallback } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  FlipHorizontal,
  Upload,
  AlertCircle,
  RefreshCw,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface QrCameraScannerProps {
  onScan: (text: string) => void;
  active?: boolean;
  className?: string;
}

interface VideoDeviceOption {
  deviceId: string;
  label: string;
}

function playScanChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // AudioContext blocked by browser policy before interaction
  }
}

/**
 * Universal getUserMedia helper with multi-tier progressive fallback
 * Guarantees compatibility across Mac (FaceTime / Continuity camera), Windows, iPhone/Safari, Android and Linux.
 */
async function requestUserMediaWithFallback(
  facingMode: "environment" | "user",
  deviceId?: string,
): Promise<MediaStream> {
  if (
    typeof navigator === "undefined" ||
    !navigator.mediaDevices ||
    !navigator.mediaDevices.getUserMedia
  ) {
    throw new Error("WEBRTC_NOT_SUPPORTED");
  }

  // Tier 0: Explicit deviceId if user chose a specific camera
  if (deviceId) {
    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });
    } catch (err) {
      console.warn("Specific deviceId failed, falling back to general constraints", err);
    }
  }

  // Tier 1: Ideal facingMode + ideal standard resolution
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facingMode },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    });
  } catch (err1) {
    console.warn("Tier 1 camera constraints failed, attempting Tier 2...", err1);
  }

  // Tier 2: Ideal facingMode without resolution restrictions
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: facingMode } },
      audio: false,
    });
  } catch (err2) {
    console.warn("Tier 2 camera constraints failed, attempting Tier 3...", err2);
  }

  // Tier 3: Opposite facingMode (e.g. Mac/Laptop webcam is usually "user" when "environment" was requested)
  try {
    const fallbackMode = facingMode === "environment" ? "user" : "environment";
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: fallbackMode } },
      audio: false,
    });
  } catch (err3) {
    console.warn("Tier 3 camera constraints failed, attempting Tier 4...", err3);
  }

  // Tier 4: Universal fallback — any available video device
  return await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });
}

export function QrCameraScanner({
  onScan,
  active = true,
  className,
}: QrCameraScannerProps) {
  const { t } = useI18n();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const scannedLockRef = useRef<boolean>(false);
  const requestIdRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);

  const [status, setStatus] = useState<
    "idle" | "requesting" | "scanning" | "permission_denied" | "error" | "scanned"
  >("requesting");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment",
  );
  const [availableDevices, setAvailableDevices] = useState<VideoDeviceOption[]>(
    [],
  );
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [analyzingFile, setAnalyzingFile] = useState<boolean>(false);

  // Mount tracking
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Refresh available devices
  const refreshDevices = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.enumerateDevices
    ) {
      return;
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices
        .filter((d) => d.kind === "videoinput")
        .map((d, index) => ({
          deviceId: d.deviceId,
          label: d.label || `${t("Cámara")} ${index + 1}`,
        }));
      if (isMountedRef.current) {
        setAvailableDevices(videoInputs);
      }
    } catch {
      // Enumeration may fail or return blank labels before permission
    }
  }, [t]);

  // Stop camera tracks cleanly without leaving dangling resources
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // ignore
      }
      videoRef.current.srcObject = null;
    }
  }, []);

  // Trigger scan complete with audio chime and haptics
  const handleDetected = useCallback(
    (codeText: string) => {
      if (scannedLockRef.current) return;
      scannedLockRef.current = true;
      setStatus("scanned");
      playScanChime();
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([40, 60, 40]);
        } catch {
          // ignore
        }
      }
      stopCamera();
      onScan(codeText);
    },
    [onScan, stopCamera],
  );

  // Start camera stream safely with race condition prevention
  const startCamera = useCallback(async () => {
    // Stop any active stream first
    stopCamera();
    scannedLockRef.current = false;

    const reqId = ++requestIdRef.current;
    setStatus("requesting");
    setErrorMessage("");

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      if (isMountedRef.current && reqId === requestIdRef.current) {
        setStatus("error");
        setErrorMessage(
          t("Tu navegador no soporta el acceso a la cámara mediante WebRTC."),
        );
      }
      return;
    }

    try {
      // Request media stream with multi-tier progressive fallback
      const stream = await requestUserMediaWithFallback(
        facingMode,
        selectedDeviceId || undefined,
      );

      // Check if another startCamera call was initiated or component unmounted during getUserMedia
      if (!isMountedRef.current || reqId !== requestIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Prepare video element attributes for all browsers (iOS Safari, Mac Chrome/Safari, Android)
      video.muted = true;
      video.playsInline = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("webkit-playsinline", "true");
      video.setAttribute("muted", "true");
      video.srcObject = stream;

      // Wait for video metadata to be loaded before calling play()
      // This prevents the DOMException: "The fetching process for the media resource was aborted..."
      await new Promise<void>((resolve) => {
        if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
          resolve();
          return;
        }
        const onLoaded = () => {
          video.removeEventListener("loadedmetadata", onLoaded);
          resolve();
        };
        video.addEventListener("loadedmetadata", onLoaded, { once: true });
        // Safety timeout fallback
        setTimeout(resolve, 800);
      });

      // Re-check race condition after metadata wait
      if (!isMountedRef.current || reqId !== requestIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      // Safe play() invocation
      try {
        await video.play();
      } catch (playErr: unknown) {
        const pErr = playErr as Error;
        // AbortError is normal when switching or unmounting; ignore it safely
        if (
          pErr.name === "AbortError" ||
          pErr.message?.toLowerCase().includes("aborted")
        ) {
          return;
        }
        console.warn("video.play() warning:", pErr);
      }

      if (isMountedRef.current && reqId === requestIdRef.current) {
        setStatus("scanning");
        void refreshDevices();
      }
    } catch (err: unknown) {
      if (!isMountedRef.current || reqId !== requestIdRef.current) {
        return;
      }

      const error = err as Error;

      // Benign AbortError (e.g. from user navigation or fast re-render)
      if (
        error.name === "AbortError" ||
        error.message?.toLowerCase().includes("aborted")
      ) {
        return;
      }

      if (
        error.name === "NotAllowedError" ||
        error.name === "PermissionDeniedError"
      ) {
        setStatus("permission_denied");
        setErrorMessage(
          t(
            "Permiso de cámara denegado. Permite el acceso a la cámara en los ajustes de tu navegador para escanear en vivo.",
          ),
        );
      } else if (
        error.name === "NotFoundError" ||
        error.name === "DevicesNotFoundError"
      ) {
        setStatus("error");
        setErrorMessage(
          t("No se encontró ninguna cámara disponible en este dispositivo."),
        );
      } else {
        setStatus("error");
        setErrorMessage(
          error.message || t("No se pudo iniciar la cámara del dispositivo."),
        );
      }
    }
  }, [facingMode, selectedDeviceId, stopCamera, refreshDevices, t]);

  // Frame processing loop
  useEffect(() => {
    if (!active || status !== "scanning") return;

    let isScanning = true;
    let lastScanTime = 0;

    const scanFrame = async () => {
      if (!isScanning || scannedLockRef.current) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;

      const now = performance.now();
      // Throttle to ~16 scans per second (~60ms) to save CPU/battery
      if (
        now - lastScanTime >= 60 &&
        video &&
        video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
      ) {
        lastScanTime = now;

        const width = video.videoWidth;
        const height = video.videoHeight;

        if (width > 0 && height > 0) {
          // 1. Try native BarcodeDetector API if supported (Chrome/Android hardware accelerated)
          if (
            typeof window !== "undefined" &&
            "BarcodeDetector" in window
          ) {
            try {
              type BarcodeDetectorInstance = {
                detect: (
                  source: ImageBitmapSource,
                ) => Promise<Array<{ rawValue?: string }>>;
              };
              type BarcodeDetectorConstructor = new (options?: {
                formats: string[];
              }) => BarcodeDetectorInstance;
              const BarcodeDetectorClass = (
                window as unknown as {
                  BarcodeDetector: BarcodeDetectorConstructor;
                }
              ).BarcodeDetector;
              const detector = new BarcodeDetectorClass({
                formats: ["qr_code"],
              });
              const barcodes = await detector.detect(video);
              if (barcodes.length > 0 && barcodes[0]?.rawValue) {
                handleDetected(barcodes[0].rawValue);
                return;
              }
            } catch {
              // Fallback to jsQR below
            }
          }

          // 2. Fallback to jsQR canvas scanner (universal: iOS Safari, Firefox, Desktop Mac/PC)
          if (canvas) {
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx) {
              ctx.drawImage(video, 0, 0, width, height);
              try {
                const imageData = ctx.getImageData(0, 0, width, height);
                const code = jsQR(
                  imageData.data,
                  imageData.width,
                  imageData.height,
                  {
                    inversionAttempts: "dontInvert",
                  },
                );
                if (code && code.data && code.data.trim()) {
                  handleDetected(code.data.trim());
                  return;
                }
              } catch {
                // Ignore canvas read error during frame changes
              }
            }
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame);
    };

    animFrameRef.current = requestAnimationFrame(scanFrame);

    return () => {
      isScanning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [active, status, handleDetected]);

  // Handle active prop changes and component unmount
  useEffect(() => {
    if (active) {
      void startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [active, startCamera, stopCamera]);

  // Switch facing mode (environment <-> user)
  const toggleFacingMode = () => {
    setSelectedDeviceId(""); // clear specific device lock when toggling mode
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Upload an image with a QR code
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzingFile(true);

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (loadEvt) => {
      img.onload = () => {
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setAnalyzingFile(false);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "attemptBoth",
        });

        setAnalyzingFile(false);
        if (code && code.data) {
          handleDetected(code.data.trim());
        } else {
          toast.error(
            t("No se detectó un código QR legible en la imagen seleccionada."),
            {
              description: t(
                "Asegúrate de que el código QR esté nítido, bien iluminado y sin reflejos.",
              ),
            },
          );
        }
      };
      img.src = loadEvt.target?.result as string;
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center overflow-hidden rounded-2xl border border-primary/20 bg-black/90 p-4 text-white shadow-xl sm:p-6",
        className,
      )}
    >
      {/* Background decoration & Mexican grecas style accent */}
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-primary via-gold to-jade opacity-80" />

      {/* Header bar */}
      <div className="mb-4 flex w-full flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/25 text-primary">
            <Camera className="h-4 w-4" />
          </span>
          <div>
            <h2 className="font-serif text-base font-semibold text-sand sm:text-lg">
              {t("Escáner de Pasaporte Cultural")}
            </h2>
            <p className="text-[11px] text-white/70">
              {status === "scanning"
                ? t("Cámara activa · Enfoca el código QR de la pieza")
                : t("Verificación física y digital en tiempo real")}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {/* Multi-camera selector dropdown (Mac / PC / Multi-camera phones) */}
          {availableDevices.length > 1 ? (
            <div className="flex items-center gap-1">
              <select
                value={selectedDeviceId}
                onChange={(e) => {
                  setSelectedDeviceId(e.target.value);
                }}
                disabled={status === "requesting"}
                className="h-8 max-w-[130px] sm:max-w-[180px] truncate rounded-lg border border-white/20 bg-white/10 px-2 text-xs text-white backdrop-blur-xs outline-none hover:bg-white/20 cursor-pointer"
                title={t("Seleccionar cámara")}
              >
                <option value="" className="bg-slate-900 text-white">
                  {facingMode === "environment"
                    ? t("Cámara principal")
                    : t("Cámara frontal")}
                </option>
                {availableDevices.map((d, i) => (
                  <option
                    key={d.deviceId || i}
                    value={d.deviceId}
                    className="bg-slate-900 text-white"
                  >
                    {d.label}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleFacingMode}
                disabled={status === "requesting"}
                className="h-8 border-white/20 bg-white/10 px-2 text-xs text-white hover:bg-white/20"
                title={t("Alternar cámara trasera/frontal")}
              >
                <FlipHorizontal className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={toggleFacingMode}
              disabled={status === "requesting"}
              className="h-8 border-white/20 bg-white/10 px-2.5 text-xs text-white hover:bg-white/20"
              title={t("Cambiar cámara")}
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {facingMode === "environment" ? t("Trasera") : t("Frontal")}
              </span>
            </Button>
          )}

          <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-2.5 text-xs font-medium text-white transition-colors hover:bg-white/20">
            <Upload className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("Subir imagen")}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              disabled={analyzingFile}
            />
          </label>
        </div>
      </div>

      {/* Camera Viewfinder Box */}
      <div className="relative aspect-square w-full max-w-[360px] overflow-hidden rounded-2xl border-2 border-white/15 bg-black/95 shadow-inner sm:max-w-[420px]">
        {/* Hidden Canvas for QR decoding */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Video feed */}
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          muted
          playsInline
          autoPlay
        />

        {/* Viewfinder Overlays */}
        {status === "scanning" && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6">
            {/* Dark vignette corners */}
            <div className="relative h-64 w-64 max-w-[80%] rounded-xl">
              {/* Corner reticles */}
              <div className="absolute -left-1 -top-1 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-gold shadow-[0_0_12px_rgba(209,160,84,0.8)]" />
              <div className="absolute -right-1 -top-1 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-gold shadow-[0_0_12px_rgba(209,160,84,0.8)]" />
              <div className="absolute -bottom-1 -left-1 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-gold shadow-[0_0_12px_rgba(209,160,84,0.8)]" />
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-gold shadow-[0_0_12px_rgba(209,160,84,0.8)]" />

              {/* Sweeping scan laser */}
              <div className="absolute inset-x-2 top-0 h-0.5 animate-[scanLaser_2.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-jade to-transparent shadow-[0_0_8px_#27ae60]" />

              {/* Center subtle target crosshair */}
              <div className="absolute inset-0 flex items-center justify-center opacity-25">
                <div className="h-6 w-0.5 bg-white" />
                <div className="h-0.5 w-6 bg-white" />
              </div>
            </div>

            {/* Instruction pill */}
            <div className="mt-4 flex items-center gap-1.5 rounded-full bg-black/75 px-3 py-1 text-xs text-white/90 backdrop-blur-xs shadow-md">
              <span className="h-2 w-2 rounded-full bg-jade animate-ping" />
              <span className="font-medium">
                {t("Alinea el código QR dentro del recuadro")}
              </span>
            </div>
          </div>
        )}

        {/* Status: Requesting camera */}
        {status === "requesting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/20 text-primary animate-pulse">
              <Camera className="h-6 w-6" />
            </div>
            <p className="font-medium text-sm text-sand">
              {t("Conectando con la cámara de tu dispositivo…")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("Por favor concede el permiso en el navegador cuando se solicite.")}
            </p>
          </div>
        )}

        {/* Status: Scanned (success animation) */}
        {status === "scanned" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-jade/25 backdrop-blur-xs p-6 text-center animate-in fade-in">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-jade text-white shadow-lg scale-110 transition-transform">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <p className="font-serif text-lg font-semibold text-white">
              {t("¡Código QR detectado!")}
            </p>
            <p className="text-xs text-white/80">
              {t("Consultando expediente en el registro de Tlamatik…")}
            </p>
          </div>
        )}

        {/* Status: Permission denied */}
        {status === "permission_denied" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-destructive/20 text-destructive">
              <CameraOff className="h-6 w-6" />
            </div>
            <p className="font-serif text-base font-semibold text-sand">
              {t("Permiso de cámara bloqueado")}
            </p>
            <p className="text-xs text-white/70 max-w-xs leading-relaxed">
              {errorMessage ||
                t(
                  "No se pudo acceder a la cámara. Habilita los permisos de video en el candado de la barra de direcciones o utiliza la búsqueda manual.",
                )}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => void startCamera()}
              className="mt-2 border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {t("Reintentar activación")}
            </Button>
          </div>
        )}

        {/* Status: Error or not found */}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-amber-500/20 text-amber-400">
              <AlertCircle className="h-6 w-6" />
            </div>
            <p className="font-serif text-base font-semibold text-sand">
              {t("Cámara no disponible")}
            </p>
            <p className="text-xs text-white/70 max-w-xs leading-relaxed">
              {errorMessage ||
                t("No se pudo iniciar el dispositivo de video en este navegador.")}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                size="sm"
                variant="outline"
                onClick={() => void startCamera()}
                className="mt-2 border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {t("Reintentar")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  toggleFacingMode();
                  void startCamera();
                }}
                className="mt-2 border-white/20 bg-white/10 text-xs text-white hover:bg-white/20"
              >
                <FlipHorizontal className="h-3.5 w-3.5" />
                {t("Probar otra cámara")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Footer tips and sample shortcuts */}
      <div className="mt-3 flex w-full flex-wrap items-center justify-between gap-2 px-1 text-xs text-white/70">
        <span className="flex items-center gap-1.5 text-[11px]">
          <ShieldCheck className="h-3.5 w-3.5 text-jade" />
          {t("Compatible con QR de Kits Phygital, CoDi® y URLs de Tlamatik")}
        </span>
      </div>

      <style>{`
        @keyframes scanLaser {
          0% { top: 0%; opacity: 0.8; }
          50% { top: 96%; opacity: 1; }
          100% { top: 0%; opacity: 0.8; }
        }
      `}</style>
    </div>
  );
}


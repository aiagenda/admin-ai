import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import type { TourStep } from "@/lib/home-tour-steps";

const POPOVER_WIDTH = 400;
const SPOT_GAP = 12;
const PADDING = 24;
const POPOVER_PADDING = 32;

interface SpotlightTourProps {
  isOpen: boolean;
  onClose: () => void;
  onDone: () => void;
  steps: TourStep[];
}

export function SpotlightTour({ isOpen, onClose, onDone, steps }: SpotlightTourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const step = steps[stepIndex];
  const total = steps.length;
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === total - 1;

  const updateRect = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step?.selector]);

  useEffect(() => {
    if (!isOpen || !step) return;
    updateRect();
    const t = setTimeout(updateRect, 400);
    const onScroll = () => updateRect();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", updateRect);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [isOpen, stepIndex, step, updateRect]);

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen]);

  const handleNext = () => {
    if (isLast) {
      onDone();
      onClose();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const handlePrev = () => {
    if (!isFirst) setStepIndex((i) => i - 1);
  };

  if (!isOpen || !step) return null;

  const clipPath = rect
    ? `polygon(0 0, 100vw 0, 100vw 100vh, 0 100vh, 0 0, ${rect.left}px ${rect.top}px, ${rect.right}px ${rect.top}px, ${rect.right}px ${rect.bottom}px, ${rect.left}px ${rect.bottom}px, ${rect.left}px ${rect.top}px)`
    : "none";

  let popoverLeft = rect ? rect.left + rect.width / 2 - POPOVER_WIDTH / 2 : 24;
  let popoverTop = rect
    ? step.side === "bottom"
      ? rect.bottom + SPOT_GAP
      : step.side === "top"
        ? rect.top - 320
        : rect.top + rect.height / 2 - 120
    : 100;
  popoverLeft = Math.max(PADDING, Math.min(popoverLeft, window.innerWidth - POPOVER_WIDTH - PADDING));
  popoverTop = Math.max(PADDING, Math.min(popoverTop, window.innerHeight - 320));

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000000000,
        pointerEvents: "auto",
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.72)",
          clipPath: rect ? clipPath : undefined,
          pointerEvents: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {rect && (
        <div
          style={{
            position: "fixed",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.35) 100%)",
            boxShadow: "inset 0 0 50px 12px rgba(255,255,255,0.18)",
            pointerEvents: "none",
            borderRadius: 10,
          }}
          aria-hidden
        />
      )}
      {rect && (
        <div
          style={{
            position: "fixed",
            left: rect.left - 4,
            top: rect.top - 4,
            width: rect.width + 8,
            height: rect.height + 8,
            border: "2px solid rgba(37, 99, 235, 0.9)",
            borderRadius: 12,
            pointerEvents: "none",
            boxSizing: "border-box",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.15), 0 0 0 4px rgba(37, 99, 235, 0.2), 0 0 32px 8px rgba(37, 99, 235, 0.35), 0 0 60px 16px rgba(37, 99, 235, 0.15)",
          }}
        />
      )}
      <div
        style={{
          position: "fixed",
          left: popoverLeft,
          top: popoverTop,
          width: POPOVER_WIDTH,
          maxWidth: "calc(100vw - 48px)",
          background: "#fff",
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          padding: 0,
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          color: "#1a1a1a",
          boxSizing: "border-box",
        }}
      >
        <div style={{ padding: `${POPOVER_PADDING}px ${POPOVER_PADDING}px 0 ${POPOVER_PADDING}px`, paddingRight: POPOVER_PADDING + 36 }}>
          <h3 style={{ margin: 0, marginBottom: 12, fontSize: 17, fontWeight: 600, lineHeight: 1.35 }}>
            {step.title}
          </h3>
          <p style={{ margin: 0, marginBottom: 20, fontSize: 14, lineHeight: 1.55, color: "#444" }}>
            {step.description}
          </p>
        </div>
        <div
          style={{
            padding: `${POPOVER_PADDING - 4}px ${POPOVER_PADDING}px ${POPOVER_PADDING}px`,
            borderTop: "1px solid #eee",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#666",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              padding: "6px 10px",
              background: "#f5f5f5",
              borderRadius: 6,
            }}
          >
            {stepIndex + 1} / {total}
          </span>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={handlePrev}
              disabled={isFirst}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14,
                border: "1px solid #ccc",
                background: "#fff",
                color: "#333",
                cursor: isFirst ? "default" : "pointer",
                opacity: isFirst ? 0.6 : 1,
              }}
            >
              Előző
            </button>
            <button
              type="button"
              onClick={handleNext}
              style={{
                padding: "10px 18px",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: 14,
                border: "none",
                background: "#2563eb",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {isLast ? (step.nextBtnText ?? "Kész") : "Következő"}
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Bezárás"
          style={{
            position: "absolute",
            top: POPOVER_PADDING - 4,
            right: POPOVER_PADDING - 4,
            width: 36,
            height: 36,
            border: "none",
            background: "transparent",
            color: "#999",
            fontSize: 20,
            cursor: "pointer",
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>
    </div>,
    document.body
  );
}

import { createRoot } from "react-dom/client";
import "./i18n/config";
import App from "./App.tsx";
import "./index.css";

// ─── PostHog analytics ──────────────────────────────────────────────────────
// Set VITE_POSTHOG_KEY in .env to enable. Free tier: 1M events/month.
// Sign up at https://app.posthog.com — takes 2 minutes.
if (import.meta.env.VITE_POSTHOG_KEY) {
  import("posthog-js").then(({ default: posthog }) => {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: import.meta.env.VITE_POSTHOG_HOST || "https://eu.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      persistence: "localStorage",
      autocapture: true,
      enableExceptionAutocapture: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: ".sensitive",
      },
    });
  });
}

// ─── PWA Service Worker ──────────────────────────────────────────────────────
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("Service Worker registered:", registration.scope);
      })
      .catch((error) => {
        console.error("Service Worker registration failed:", error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);

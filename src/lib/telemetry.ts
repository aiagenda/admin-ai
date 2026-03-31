export type TelemetryPayload = Record<string, unknown>;

export function trackEvent(event: string, payload: TelemetryPayload = {}) {
  const detail = { event, payload, ts: new Date().toISOString() };

  // Local event bus for future analytics adapters.
  window.dispatchEvent(new CustomEvent("app-telemetry", { detail }));

  // Keep console output for quick debugging in dev.
  if (import.meta.env.DEV) {
    console.info("[telemetry]", detail);
  }
}

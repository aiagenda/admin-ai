import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8083,
    hmr: { port: 8083, host: "localhost", protocol: "ws" },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // vendor-exceljs (~940kB) is the only chunk above 500kB; it is lazy-loaded
    // only when exporting from the bookkeeping archive, so it never blocks first paint.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — always needed
          "vendor-react": ["react", "react-dom", "react-router-dom"],

          // Supabase — loaded on every auth-required page
          "vendor-supabase": ["@supabase/supabase-js"],

          // Data fetching
          "vendor-query": ["@tanstack/react-query"],

          // All Radix UI primitives (large but tree-shaken per component)
          "vendor-radix": [
            "@radix-ui/react-accordion",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-avatar",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-collapsible",
            "@radix-ui/react-context-menu",
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-hover-card",
            "@radix-ui/react-label",
            "@radix-ui/react-menubar",
            "@radix-ui/react-navigation-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-progress",
            "@radix-ui/react-radio-group",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-select",
            "@radix-ui/react-separator",
            "@radix-ui/react-slider",
            "@radix-ui/react-slot",
            "@radix-ui/react-switch",
            "@radix-ui/react-tabs",
            "@radix-ui/react-toast",
            "@radix-ui/react-toggle",
            "@radix-ui/react-toggle-group",
            "@radix-ui/react-tooltip",
          ],

          // i18n — loads on every page but separable
          "vendor-i18n": [
            "i18next",
            "react-i18next",
            "i18next-browser-languagedetector",
          ],

          // Forms / validation — loaded only on form-heavy pages
          "vendor-forms": [
            "react-hook-form",
            "zod",
            "@hookform/resolvers",
          ],

          // Charts — only on analytics/dashboard pages
          "vendor-charts": ["recharts"],

          // PDF generation — only on export paths (lazy-load candidate)
          "vendor-pdf": ["jspdf", "pdfmake"],

          // Excel export — split: InvoiceArchive uses exceljs, ExportForAccountant uses xlsx
          "vendor-exceljs": ["exceljs"],
          "vendor-xlsx": ["xlsx"],

          // Animation — framer-motion is large, separate chunk
          "vendor-animation": ["framer-motion"],

          // DnD — only on home card list
          "vendor-dnd": ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
}));

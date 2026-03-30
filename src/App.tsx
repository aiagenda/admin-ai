import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { EnterpriseRoute } from "@/components/EnterpriseRoute";
import { Navbar } from "@/components/Navbar";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Upload from "./pages/Upload";
import Result from "./pages/Result";
import Archive from "./pages/Archive";
import Compare from "./pages/Compare";
import Help from "./pages/Help";
import Pricing from "./pages/Pricing";
import Search from "./pages/Search";
import FormFill from "./pages/FormFill";
import NotFound from "./pages/NotFound";
import FormAdmin from "./pages/admin/FormAdmin";
import Analytics from "./pages/admin/Analytics";
import KnowledgeBaseAdmin from "./pages/admin/KnowledgeBaseAdmin";
import AIStudio from "./pages/admin/AIStudio";
import Settings from "./pages/Settings";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import InvoiceArchive from "./pages/InvoiceArchive";
import InvoiceUpload from "./pages/InvoiceUpload";
import InvoiceDetail from "./pages/InvoiceDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <PWAInstallBanner />
              <main className="flex-1 pb-[env(safe-area-inset-bottom)]">
                <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/help" element={<Help />} />
                <Route
                  path="/search"
                  element={
                    <ProtectedRoute>
                      <Search />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/form/:formKey"
                  element={
                    <ProtectedRoute>
                      <FormFill />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <Upload />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/result/:id"
                  element={
                    <ProtectedRoute>
                      <Result />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/archive"
                  element={
                    <ProtectedRoute>
                      <Archive />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compare"
                  element={
                    <ProtectedRoute>
                      <Compare />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute>
                      <Checkout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/success"
                  element={
                    <ProtectedRoute>
                      <CheckoutSuccess />
                    </ProtectedRoute>
                  }
                />
                {/* Könyvelés modul - Számlák */}
                <Route
                  path="/invoices"
                  element={
                    <ProtectedRoute>
                      <InvoiceArchive />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/invoices/upload"
                  element={
                    <ProtectedRoute>
                      <InvoiceUpload />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/invoices/:id"
                  element={
                    <ProtectedRoute>
                      <InvoiceDetail />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/forms"
                  element={
                    <AdminRoute>
                      <FormAdmin />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/analytics"
                  element={
                    <AdminRoute>
                      <Analytics />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/ai-studio"
                  element={
                    <AdminRoute>
                      <EnterpriseRoute featureName="AI Studio">
                        <AIStudio />
                      </EnterpriseRoute>
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/knowledge-base"
                  element={
                    <AdminRoute>
                      <KnowledgeBaseAdmin />
                    </AdminRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
            </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

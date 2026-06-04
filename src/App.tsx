import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { OwnerRoute } from "@/components/OwnerRoute";
import { Navbar } from "@/components/Navbar";
import { LangSync } from "@/components/LangSync";
import { MarketRouteGuard } from "@/components/MarketRouteGuard";
import { PWAInstallBanner } from "@/components/PWAInstallBanner";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Upload from "./pages/Upload";
const Result = lazy(() => import("./pages/Result"));
const Pricing = lazy(() => import("./pages/Pricing"));
import NotFound from "./pages/NotFound";

// Lazy-loaded routes — split into separate chunks, loaded on demand
const Archive = lazy(() => import("./pages/Archive"));
const Compare = lazy(() => import("./pages/Compare"));
const Help = lazy(() => import("./pages/Help"));
const Search = lazy(() => import("./pages/Search"));
const FormFill = lazy(() => import("./pages/FormFill"));
const FormAdmin = lazy(() => import("./pages/admin/FormAdmin"));
const Analytics = lazy(() => import("./pages/admin/Analytics"));
const KnowledgeBaseAdmin = lazy(() => import("./pages/admin/KnowledgeBaseAdmin"));
const AIStudio = lazy(() => import("./pages/admin/AIStudio"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const UsersAdmin = lazy(() => import("./pages/admin/UsersAdmin"));
const BlogAdmin = lazy(() => import("./pages/admin/BlogAdmin"));
const Settings = lazy(() => import("./pages/Settings"));
const Checkout = lazy(() => import("./pages/Checkout"));
const CheckoutSuccess = lazy(() => import("./pages/CheckoutSuccess"));
const InvoiceArchive = lazy(() => import("./pages/InvoiceArchive"));
const InvoiceUpload = lazy(() => import("./pages/InvoiceUpload"));
const InvoiceDetail = lazy(() => import("./pages/InvoiceDetail"));
const BlogPostPage = lazy(() => import("./pages/BlogPostPage"));
const BlogIndexPage = lazy(() => import("./pages/BlogIndexPage"));
const IRSNoticesPage = lazy(() => import("./pages/IRSNoticesPage"));
const SSALettersPage = lazy(() => import("./pages/SSALettersPage"));
const StateTaxPage = lazy(() => import("./pages/StateTaxPage"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const DataProcessingAgreement = lazy(() => import("./pages/legal/DataProcessingAgreement"));
const Imprint = lazy(() => import("./pages/legal/Imprint"));
const SecurityPage = lazy(() => import("./pages/legal/SecurityPage"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MarketRouteGuard />
          <LangSync />
          <AuthProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <PWAInstallBanner />
              <main className="flex-1 pb-20 md:pb-[env(safe-area-inset-bottom)]">
                <Suspense fallback={<div className="flex items-center justify-center min-h-[60vh]"><div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /></div>}>
                <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/auth/callback" element={<AuthCallback />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/help" element={<Help />} />
                <Route path="/irs-notices" element={<IRSNoticesPage />} />
                <Route path="/state-tax-letters" element={<StateTaxPage />} />
                <Route path="/ssa-letters" element={<SSALettersPage />} />
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
                {/* Bookkeeping module - Invoices */}
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
                <Route path="/legal/privacy" element={<PrivacyPolicy />} />
                <Route path="/legal/cookies" element={<CookiePolicy />} />
                <Route path="/legal/terms" element={<TermsOfService />} />
                <Route path="/legal/dpa" element={<DataProcessingAgreement />} />
                <Route path="/legal/imprint" element={<Imprint />} />
                <Route path="/legal/security" element={<SecurityPage />} />
                <Route
                  path="/admin"
                  element={
                    <AdminRoute>
                      <AdminDashboard />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <AdminRoute>
                      <UsersAdmin />
                    </AdminRoute>
                  }
                />
                <Route
                  path="/admin/blog"
                  element={
                    <AdminRoute>
                      <BlogAdmin />
                    </AdminRoute>
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
                      <OwnerRoute>
                        <AIStudio />
                      </OwnerRoute>
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
                <Route path="/blog" element={<BlogIndexPage />} />
                <Route path="/blog/:slug" element={<BlogPostPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
                </Suspense>
            </main>
              <MobileBottomNav />
          </div>
            </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

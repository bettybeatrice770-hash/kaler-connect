import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/portal/RequireAuth";
import { RequireAdmin } from "@/components/portal/RequireAdmin";
import { Loader2 } from "lucide-react";
import Index from "./pages/Index.tsx";

const APP_VERSION = "2026.06.07-1"; 

const RouteFallback = () => (
  <div className="min-h-screen grid place-items-center bg-background">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

const Login = lazy(() => import("./pages/Login.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Profile = lazy(() => import("./pages/Profile.tsx"));
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview.tsx"));
const AdminMembers = lazy(() => import("./pages/admin/AdminMembers.tsx"));
const AdminMemberDetail = lazy(() => import("./pages/admin/AdminMemberDetail.tsx"));
const AdminFamilies = lazy(() => import("./pages/admin/AdminFamilies.tsx"));
const AdminBootstrap = lazy(() => import("./pages/admin/AdminBootstrap.tsx"));
const AdminEvents = lazy(() => import("./pages/admin/AdminEvents.tsx"));
const AdminImport = lazy(() => import("./pages/admin/AdminImport.tsx"));
const AdminRoles = lazy(() => import("./pages/admin/AdminRoles.tsx"));
const AdminAuditLog = lazy(() => import("./pages/admin/AdminAuditLog.tsx"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const ChangePassword = lazy(() => import("./pages/ChangePassword.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    const savedVersion = localStorage.getItem("app_version");
    if (savedVersion !== null && savedVersion !== APP_VERSION) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem("app_version", APP_VERSION);
      window.location.reload();
    }
    localStorage.setItem("app_version", APP_VERSION);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/change-password" element={<RequireAuth><ChangePassword /></RequireAuth>} />
                <Route path="/admin/roles" element={<RequireAdmin><AdminRoles /></RequireAdmin>} />
                <Route path="/admin/audit" element={<RequireAdmin><AdminAuditLog /></RequireAdmin>} />
                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
                <Route path="/admin" element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
                <Route path="/admin/members" element={<RequireAdmin><AdminMembers /></RequireAdmin>} />
                <Route path="/admin/members/:id" element={<RequireAdmin><AdminMemberDetail /></RequireAdmin>} />
                <Route path="/admin/families" element={<RequireAdmin><AdminFamilies /></RequireAdmin>} />
                <Route path="/admin/events" element={<RequireAdmin><AdminEvents /></RequireAdmin>} />
                <Route path="/admin/import" element={<RequireAdmin><AdminImport /></RequireAdmin>} />
                <Route path="/admin/bootstrap" element={<AdminBootstrap />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;

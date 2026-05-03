import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { RequireAuth } from "@/components/portal/RequireAuth";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Profile from "./pages/Profile.tsx";
import AdminOverview from "./pages/admin/AdminOverview.tsx";
import AdminMembers from "./pages/admin/AdminMembers.tsx";
import AdminMemberDetail from "./pages/admin/AdminMemberDetail.tsx";
import AdminFamilies from "./pages/admin/AdminFamilies.tsx";
import AdminBootstrap from "./pages/admin/AdminBootstrap.tsx";
import AdminEvents from "./pages/admin/AdminEvents.tsx";
import AdminImport from "./pages/admin/AdminImport.tsx";
import { RequireAdmin } from "@/components/portal/RequireAdmin";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/admin" element={<RequireAdmin><AdminOverview /></RequireAdmin>} />
            <Route path="/admin/members" element={<RequireAdmin><AdminMembers /></RequireAdmin>} />
            <Route path="/admin/members/:id" element={<RequireAdmin><AdminMemberDetail /></RequireAdmin>} />
            <Route path="/admin/families" element={<RequireAdmin><AdminFamilies /></RequireAdmin>} />
            <Route path="/admin/events" element={<RequireAdmin><AdminEvents /></RequireAdmin>} />
            <Route path="/admin/import" element={<RequireAdmin><AdminImport /></RequireAdmin>} />
            <Route path="/admin/bootstrap" element={<AdminBootstrap />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

// Allows admins, officers and branch reps to view admin pages.
// Write actions are still gated by database RLS (admins only),
// so officers/branch reps effectively get read-only access.
export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, loading, isStaff } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (!isStaff) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

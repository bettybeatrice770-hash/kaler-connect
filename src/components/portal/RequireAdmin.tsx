import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export const RequireAdmin = ({ children }: { children: ReactNode }) => {
  const { user, loading, isStaff, mustChangePassword } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) return <Navigate to="/login" replace />;
  if (mustChangePassword) return <Navigate to="/change-password" replace />;
  
  // Ensure the user has the required staff role
  if (!isStaff) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

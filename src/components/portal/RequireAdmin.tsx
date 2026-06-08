import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface RequireAdminProps {
  children: ReactNode;
}

/**
 * RequireAdmin Component
 * * Logic flow:
 * 1. Wait for auth state to load.
 * 2. Redirect unauthenticated users to /login.
 * 3. Enforce password changes for users with 'mustChangePassword' flag.
 * 4. Restrict access to users without 'isStaff' privileges, sending them to /dashboard.
 */
export const RequireAdmin = ({ children }: RequireAdminProps) => {
  const { user, loading, isStaff, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Enforce password change before allowing access to admin routes
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  // Restrict access to staff members only
  if (!isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

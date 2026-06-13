import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

/**
 * RequireAuth — route guard for protected pages.
 *
 * Behaviour:
 * - While auth is loading: show spinner (prevents redirect flicker).
 * - Not logged in: redirect to /login.
 * - Logged in but must_change_password = true: redirect to /change-password
 *   for any route EXCEPT /change-password itself (prevents infinite loop).
 * - adminOnly + not admin: redirect to /profile.
 * - Otherwise: render children normally.
 *
 * NOTE: /change-password does NOT need a special unauthenticated allowance
 * because the flow is: member logs in with temp password → they have a session
 * → RequireAuth detects mustChangePassword → redirects here. The session is
 * always present when this page is legitimately reached.
 */
export const RequireAuth = ({
  children,
  adminOnly = false,
}: {
  children: ReactNode;
  adminOnly?: boolean;
}) => {
  const { user, loading, isAdmin, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // If the user must change their password, lock them to /change-password.
  // Allow the change-password page itself through to avoid an infinite redirect.
  if (mustChangePassword && location.pathname !== "/change-password") {
    return <Navigate to="/change-password" replace />;
  }

  if (adminOnly && !isAdmin) return <Navigate to="/profile" replace />;

  return <>{children}</>;
};

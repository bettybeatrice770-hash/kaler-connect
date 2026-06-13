import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isOfficer: boolean;
  isBranchRep: boolean;
  isStaff: boolean;
  branchAdminIds: string[];
  mustChangePassword: boolean;
  refreshAuth: () => Promise<void>;
  refreshProfileFlags: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  isAdmin: false,
  isOfficer: false,
  isBranchRep: false,
  isStaff: false,
  branchAdminIds: [],
  mustChangePassword: false,
  refreshAuth: async () => {},
  refreshProfileFlags: async () => {},
  signOut: async () => {},
});

// If get_user_auth_data hangs (network stall, DB lock, etc.) we still need
// to release the loading state rather than spinning forever.
const AUTH_RPC_TIMEOUT_MS = 8000;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [branchAdminIds, setBranchAdminIds] = useState<string[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const isAuthEventProcessing = useRef(false);

  const clearRoleState = () => {
    setRoles([]);
    setBranchAdminIds([]);
    setMustChangePassword(false);
  };

  const loadAll = async (userId: string): Promise<void> => {
    try {
      const rpcPromise = supabase.rpc("get_user_auth_data");

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("get_user_auth_data timed out")),
          AUTH_RPC_TIMEOUT_MS
        );
      });

      // Promise.race doesn't cancel the underlying request, but it
      // guarantees loadAll resolves even if the RPC never does -
      // which is what keeps `loading` from getting stuck forever.
      const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

      if (error) {
        console.error("Error loading user auth data:", error);
        clearRoleState();
        return;
      }
      if (data) {
        setRoles(data.roles ?? []);
        setBranchAdminIds(data.branch_admin_ids ?? []);
        setMustChangePassword(!!data.must_change_password);
      } else {
        clearRoleState();
      }
    } catch (err) {
      console.error("Unexpected error loading user data:", err);
      clearRoleState();
    }
  };

  const refreshAuth = async () => {
    if (!user) return;
    await loadAll(user.id);
  };

  const refreshProfileFlags = async () => {
    if (!user) return;
    const { data: prof } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .maybeSingle();
    setMustChangePassword(!!(prof as any)?.must_change_password);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    clearRoleState();
  };

  useEffect(() => {
    let mounted = true;

    // Single source of truth for session state. INITIAL_SESSION always
    // fires once on subscribe (with the existing session or null), so a
    // separate getSession() call is redundant and was racing with this
    // handler - both could call loadAll and both could flip `loading`
    // independently, leaving a window where loading=false but roles
    // hadn't loaded yet.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === "PASSWORD_RECOVERY") {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
          return;
        }

        if (event === "SIGNED_OUT" || !newSession) {
          setSession(null);
          setUser(null);
          clearRoleState();
          setLoading(false);
          return;
        }

        setSession(newSession);
        setUser(newSession.user);

        // Only the initial load should hold up the app's `loading` gate.
        // TOKEN_REFRESHED happens silently every ~hour - re-fetching roles
        // is correct, but flipping the global loading flag for it causes
        // a full-app loading flash with no user-facing reason.
        const isInitialLoad =
          event === "SIGNED_IN" || event === "INITIAL_SESSION";

        if (isInitialLoad || event === "TOKEN_REFRESHED") {
          if (isAuthEventProcessing.current) return;
          isAuthEventProcessing.current = true;
          if (mounted && isInitialLoad) setLoading(true);

          try {
            await loadAll(newSession.user.id);
          } finally {
            isAuthEventProcessing.current = false;
            if (mounted && isInitialLoad) setLoading(false);
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        isAdmin: roles.includes("admin"),
        isOfficer: roles.includes("officer"),
        isBranchRep: roles.includes("branch_rep"),
        isStaff:
          roles.includes("admin") ||
          roles.includes("officer") ||
          roles.includes("branch_rep"),
        branchAdminIds,
        mustChangePassword,
        refreshAuth,
        refreshProfileFlags,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

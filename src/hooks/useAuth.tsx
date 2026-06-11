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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roles, setRoles] = useState<string[]>([]);
  const [branchAdminIds, setBranchAdminIds] = useState<string[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);

  // FIX: Track in-flight loadAll calls with a ref so we never run two
  // concurrent RPC calls (one from initializeAuth + one from onAuthStateChange).
  // The second call simply waits for the first to finish rather than starting
  // a duplicate network request.
  const loadingRef = useRef(false);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const loadAll = async (userId: string): Promise<void> => {
    // If a load is already in flight, reuse that promise instead of launching another.
    if (loadingRef.current && loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    loadingRef.current = true;
    loadPromiseRef.current = (async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_auth_data');
        if (error) {
          // Log but don't crash — a slow RPC shouldn't block the auth flow.
          console.error("Error loading user auth data:", error);
          return;
        }
        if (data) {
          setRoles(data.roles ?? []);
          setBranchAdminIds(data.branch_admin_ids ?? []);
          setMustChangePassword(!!data.must_change_password);
        }
      } finally {
        loadingRef.current = false;
        loadPromiseRef.current = null;
      }
    })();

    return loadPromiseRef.current;
  };

  const clearRoleState = () => {
    setRoles([]);
    setBranchAdminIds([]);
    setMustChangePassword(false);
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
    // FIX: Use a mounted flag to guard all setState calls. If this component
    // unmounts while an async operation is in-flight, stale setState calls
    // won't fire and trigger React's "update on unmounted component" warnings.
    let mounted = true;

    // FIX: Bootstrap the auth state ONCE by subscribing to onAuthStateChange
    // before calling getSession. This is the pattern recommended by Supabase.
    // It ensures we never miss an event that fires between getSession() returning
    // and the subscription being set up — which was the original source of hangs.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        // PASSWORD_RECOVERY is emitted when a user follows a reset link.
        // We simply set the session so ResetPassword.tsx can detect it —
        // we do NOT call loadAll() here since there are no roles to load yet.
        if (event === "PASSWORD_RECOVERY") {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          return;
        }

        if (event === "SIGNED_OUT" || !newSession) {
          setSession(null);
          setUser(null);
          clearRoleState();
          setLoading(false);
          return;
        }

        // For SIGNED_IN and TOKEN_REFRESHED, update session state then load roles.
        // FIX: We only call setLoading(true) if we're not already in a loading
        // state to avoid unnecessary re-renders.
        setSession(newSession);
        setUser(newSession.user);

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          if (mounted) setLoading(true);
          try {
            await loadAll(newSession.user.id);
          } finally {
            if (mounted) setLoading(false);
          }
        }
      }
    );

    // FIX: Call getSession() AFTER subscribing so the INITIAL_SESSION event
    // from onAuthStateChange does the heavy lifting. We only need getSession()
    // to handle the edge case where there is no active session (logged-out state).
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      // If there's no session and onAuthStateChange hasn't fired INITIAL_SESSION
      // yet, we can safely set loading to false here.
      if (!existingSession && mounted) {
        setLoading(false);
      }
      // If there IS a session, onAuthStateChange will fire INITIAL_SESSION
      // and handle everything — we don't duplicate the work.
    });

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

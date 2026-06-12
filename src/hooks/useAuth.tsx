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

  // Track in-flight loadAll calls with a ref so concurrent calls reuse the same promise
  const loadingRef = useRef(false);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  const loadAll = async (userId: string): Promise<void> => {
    if (loadingRef.current && loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    loadingRef.current = true;
    loadPromiseRef.current = (async () => {
      try {
        const { data, error } = await supabase.rpc('get_user_auth_data');
        if (error) {
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
    let mounted = true;
    let initialized = false;

    // 1. Subscribe to Auth State Changes immediately
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

        if (event === "PASSWORD_RECOVERY") {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setLoading(false);
          initialized = true;
          return;
        }

        if (event === "SIGNED_OUT" || !newSession) {
          setSession(null);
          setUser(null);
          clearRoleState();
          setLoading(false);
          initialized = true;
          return;
        }

        setSession(newSession);
        setUser(newSession.user);

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          if (mounted) setLoading(true); // Guarantees clean loader states on subsequent logins
          try {
            await loadAll(newSession.user.id);
          } finally {
            if (mounted) {
              setLoading(false);
              initialized = true;
            }
          }
        }
      }
    );

    // 2. Fallback check: Read initial session directly to prevent eternal loading if events don't fire
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (!mounted || initialized) return;

      if (!existingSession) {
        setLoading(false);
      } else {
        setSession(existingSession);
        setUser(existingSession.user);
        if (mounted) setLoading(true); // Ensures loading spinner remains up during fallback metadata query
        loadAll(existingSession.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      }
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

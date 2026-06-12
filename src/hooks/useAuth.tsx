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

  const isAuthEventProcessing = useRef(false);

  const loadAll = async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase.rpc('get_user_auth_data');
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!mounted) return;

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

        setSession(newSession);
        setUser(newSession.user);

        if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
          if (isAuthEventProcessing.current) return;
          isAuthEventProcessing.current = true;
          if (mounted) setLoading(true);

          try {
            await loadAll(newSession.user.id);
          } finally {
            isAuthEventProcessing.current = false;
            if (mounted) setLoading(false);
          }
        }
      }
    );

    // Immediate hydration after refresh
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (mounted) {
        if (existingSession) {
          setSession(existingSession);
          setUser(existingSession.user);
          loadAll(existingSession.user.id);
        }
        setLoading(false);
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
        isStaff: roles.includes("admin") || roles.includes("officer") || roles.includes("branch_rep"),
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

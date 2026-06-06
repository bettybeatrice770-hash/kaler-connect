import { createContext, useContext, useEffect, useState, ReactNode } from "react";
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

  const loadAll = async () => {
    console.log("🚀 Securely fetching auth data via RPC...");

    // Call RPC without arguments; function now uses auth.uid() internally
    const { data, error } = await supabase.rpc('get_user_auth_data');

    if (error) {
      console.error("❌ RPC Error fetching auth data:", error.message);
      return;
    }

    if (data) {
      setRoles(data.roles || []);
      setBranchAdminIds(data.branch_admin_ids || []);
      setMustChangePassword(!!data.must_change_password);
      console.log("✅ Auth data loaded securely via RPC.");
    }
  };

  const applySession = async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    if (newSession?.user) {
      await loadAll();
    } else {
      setRoles([]);
      setBranchAdminIds([]);
      setMustChangePassword(false);
    }
  };

  const refreshProfileFlags = async () => {
    if (!user) return;
    const { data: prof, error } = await supabase
      .from("profiles")
      .select("must_change_password")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      console.error("❌ Error running refreshProfileFlags:", error.message);
    }
    setMustChangePassword(!!(prof as any)?.must_change_password);
  };

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (active) {
          await applySession(initialSession);
        }
      } catch (error) {
        console.error("💥 Critical error initializing base auth session:", error);
      } finally {
        if (active) setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return;
      
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        setLoading(true);
      }
      
      try {
        await applySession(newSession);
      } catch (error) {
        console.error("💥 Critical error handling state update change listener:", error);
      } finally {
        if (active) setLoading(false);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRoles([]);
    setBranchAdminIds([]);
    setMustChangePassword(false);
  };

  const isAdmin = roles.includes("admin");
  const isOfficer = roles.includes("officer");
  const isBranchRep = roles.includes("branch_rep");
  const isStaff = isAdmin || isOfficer || isBranchRep;

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin, isOfficer, isBranchRep, isStaff, branchAdminIds, mustChangePassword, refreshProfileFlags, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

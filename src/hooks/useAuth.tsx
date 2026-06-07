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
    const { data, error } = await supabase.rpc('get_user_auth_data');
    if (error) return;
    if (data) {
      setRoles(data.roles || []);
      setBranchAdminIds(data.branch_admin_ids || []);
      setMustChangePassword(!!data.must_change_password);
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
    const { data: prof } = await supabase.from("profiles").select("must_change_password").eq("id", user.id).maybeSingle();
    setMustChangePassword(!!(prof as any)?.must_change_password);
  };

  useEffect(() => {
    let active = true;
    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (active) await applySession(initialSession);
      } catch (e) { console.error(e); } finally { if (active) setLoading(false); }
    };
    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return;
      // Fixed: Only trigger loading on SIGNED_IN
      if (event === "SIGNED_IN") setLoading(true);
      try { await applySession(newSession); } catch (e) { console.error(e); } finally { if (active) setLoading(false); }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  
  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setRoles([]);
    setBranchAdminIds([]);
    setMustChangePassword(false);
  };

  return (
    <AuthContext.Provider value={{ session, user, loading, isAdmin: roles.includes("admin"), isOfficer: roles.includes("officer"), isBranchRep: roles.includes("branch_rep"), isStaff: roles.includes("admin") || roles.includes("officer") || roles.includes("branch_rep"), branchAdminIds, mustChangePassword, refreshProfileFlags, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => useContext(AuthContext);

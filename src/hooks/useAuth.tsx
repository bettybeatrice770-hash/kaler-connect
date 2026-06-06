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

const AuthContext = createContext<AuthContextType>({\n  session: null,
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

  const loadAll = async (uid: string) => {
    console.log("🔄 Diagnostic: loadAll triggered for User ID:", uid);

    // Execute queries in parallel while carefully pulling out both data and error responses
    const [rolesRes, branchRes, profileRes] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("branch_admins").select("branch_id").eq("user_id", uid),
      supabase.from("profiles").select("must_change_password").eq("id", uid).maybeSingle(),
    ]);

    // 1. Evaluate user_roles execution status
    if (rolesRes.error) {
      console.error("❌ RLS / Database Error on 'user_roles' table read:", rolesRes.error.message, rolesRes.error.details);
    } else {
      console.log("✅ 'user_roles' read successfully. Found records:", rolesRes.data.length, rolesRes.data);
    }

    // 2. Evaluate branch_admins execution status
    if (branchRes.error) {
      console.error("❌ RLS / Database Error on 'branch_admins' table read:", branchRes.error.message, branchRes.error.details);
    } else {
      console.log("✅ 'branch_admins' read successfully. Found records:", branchRes.data.length, branchRes.data);
    }

    // 3. Evaluate profiles execution status
    if (profileRes.error) {
      console.error("❌ RLS / Database Error on 'profiles' table read:", profileRes.error.message, profileRes.error.details);
    } else {
      console.log("✅ 'profiles' read successfully. Record payload:", profileRes.data);
    }

    // Apply safely mapped states with arrays protecting against missing records
    setRoles((rolesRes.data || []).map((x: any) => x.role));
    setBranchAdminIds((branchRes.data || []).map((x: any) => x.branch_id));
    setMustChangePassword(!!(profileRes.data as any)?.must_change_password);
  };

  const applySession = async (newSession: Session | null) => {
    setSession(newSession);
    setUser(newSession?.user ?? null);
    if (newSession?.user) {
      await loadAll(newSession.user.id);
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

    // 1. Sequentially initialize the existing session when the application mounts
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

    // 2. Clear out double-firing updates and intercept hard event shifts cleanly
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!active) return;
      
      // Prevent internal token refresh routines from locking up the UI
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

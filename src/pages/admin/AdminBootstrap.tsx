import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";
import { normalizeKenyanPhone, phoneToAuthEmail } from "@/lib/phone";

const AdminBootstrap = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => {
    if (!loading && isAdmin) navigate("/admin");
  }, [loading, isAdmin, navigate]);

  const claim = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-bootstrap", { body: {} });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Could not grant admin", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "You are now an admin" });
    setTimeout(() => window.location.assign("/admin"), 600);
  };

  const signupAndClaim = async () => {
    const e164 = normalizeKenyanPhone(phone);
    if (!e164) { toast({ title: "Invalid phone", variant: "destructive" }); return; }
    if (password.length < 6) { toast({ title: "Password min 6 chars", variant: "destructive" }); return; }
    if (!fullName.trim()) { toast({ title: "Enter your name", variant: "destructive" }); return; }
    setBusy(true);
    const { error: suErr } = await supabase.auth.signUp({
      email: phoneToAuthEmail(e164),
      password,
      options: { data: { full_name: fullName, phone: e164 }, emailRedirectTo: window.location.origin },
    });
    if (suErr) {
      // Try sign-in if account already exists
      const { error: siErr } = await supabase.auth.signInWithPassword({ email: phoneToAuthEmail(e164), password });
      if (siErr) { setBusy(false); toast({ title: "Could not sign up or sign in", description: siErr.message, variant: "destructive" }); return; }
    }
    // Ensure profile exists
    const { data: { user: u } } = await supabase.auth.getUser();
    if (u) {
      await supabase.from("profiles").upsert({ id: u.id, full_name: fullName, phone: e164 }, { onConflict: "id" });
    }
    setBusy(false);
    await claim();
  };

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-b from-secondary to-background p-4">
      <Card className="max-w-md w-full shadow-elegant">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 rounded-md bg-gradient-gold grid place-items-center shadow-gold">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="font-display text-2xl">Become first admin</CardTitle>
          <CardDescription>
            One-time setup. Locks itself once an admin exists. Use the secretary's phone &amp; a password you'll remember.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {user ? (
            <Button onClick={claim} disabled={busy} variant="hero" className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim admin access"}
            </Button>
          ) : (
            <>
              <div className="space-y-1"><Label>Full name</Label><Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Joseph Oluoch" /></div>
              <div className="space-y-1"><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="0701 594 936" /></div>
              <div className="space-y-1"><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 6 characters" /></div>
              <Button onClick={signupAndClaim} disabled={busy} variant="hero" className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account & claim admin"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminBootstrap;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";

const ChangePassword = () => {
  const { user, loading, mustChangePassword, signOut } = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!user) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
    if (pw !== pw2) return toast({ title: "Passwords don't match", variant: "destructive" });
    
    setBusy(true);

    try {
      const { error: authError } = await supabase.auth.updateUser({ password: pw });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          must_change_password: false, 
          reset_requested: false, 
          reset_requested_at: null 
        })
        .eq("id", user.id);
      
      if (profileError) throw profileError;

      toast({ title: "Password updated", description: "Please sign in with your new password." });
      navigate("/login", { replace: true });
      await signOut();
    } catch (err: any) {
      console.error("Update error:", err);
      toast({ 
        title: "Update failed", 
        description: err.message || "An unexpected error occurred.", 
        variant: "destructive" 
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background grid place-items-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader>
          <CardTitle className="font-display text-2xl flex items-center gap-2">
            <KeyRound className="h-5 w-5" /> {mustChangePassword ? "Set a new password" : "Change your password"}
          </CardTitle>
          <CardDescription>
            {mustChangePassword ? "For your security, please replace the temporary password." : "Choose a new password."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">New password</Label>
              <Input id="pw" type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw2">Confirm password</Label>
              <Input id="pw2" type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} required minLength={8} />
            </div>
            <Button type="submit" variant="hero" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
            </Button>
            {!mustChangePassword && (
              <Button type="button" variant="outline" className="w-full" onClick={() => navigate(-1)} disabled={busy}>Cancel</Button>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default ChangePassword;

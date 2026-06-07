import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, KeyRound } from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setReady(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) return toast({ title: "Password too short", description: "Use at least 8 characters.", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    toast({ title: "Password updated. Sign in again." });
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background grid place-items-center p-4">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader>
          <CardTitle className="font-display text-2xl flex items-center gap-2"><KeyRound className="h-5 w-5" /> Set a new password</CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? (
            <p className="text-sm text-muted-foreground">Validating link...</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newpw">New password</Label>
                <Input id="newpw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
};
export default ResetPassword;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck } from "lucide-react";

const AdminBootstrap = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate("/login");
    if (!loading && isAdmin) navigate("/admin");
  }, [user, loading, isAdmin, navigate]);

  const claim = async () => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-bootstrap", { body: {} });
    setBusy(false);
    if (error || (data as any)?.error) {
      toast({ title: "Could not grant admin", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "You are now an admin", description: "Sign out and back in to refresh, or continue." });
    setTimeout(() => window.location.assign("/admin"), 800);
  };

  if (loading || !user) {
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
            One-time setup. This works only if no admin exists yet. After the first admin is set, this page is locked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={claim} disabled={busy} variant="hero" className="w-full">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Claim admin access"}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
};

export default AdminBootstrap;

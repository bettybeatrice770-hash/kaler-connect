import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { normalizeKenyanPhone } from "@/lib/phone";
import { Loader2, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const e164 = normalizeKenyanPhone(phone);
    if (!e164) return toast({ title: "Invalid phone", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.rpc("request_password_reset_by_phone", { _phone: e164 });
    setBusy(false);
    if (error) return toast({ title: "Could not submit request", description: error.message, variant: "destructive" });
    setSent(true);
    toast({
      title: "Reset request sent",
      description: "The secretary will verify your identity and issue a new temporary password.",
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background grid place-items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>
        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="font-display text-2xl">Request password reset</CardTitle>
            <CardDescription>
              Enter your registered phone number. The secretary will verify you offline, then issue a temporary password you'll change at next login.
              You can also call <strong>Joseph Oluoch</strong> on{" "}
              <a className="text-primary" href="tel:+254701594936">0701 594 936</a>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="space-y-3">
                <p className="text-sm">Your request has been recorded. Please wait for the secretary to issue a new temporary password.</p>
                <Link to="/login" className="text-sm text-primary hover:underline">Back to login</Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2"><Label>Phone number</Label>
                  <Input type="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>
                <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request reset"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ForgotPassword;

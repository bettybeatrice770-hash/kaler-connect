import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { normalizeKenyanPhone, phoneToAuthEmail } from "@/lib/phone";
import { Loader2, ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const e164 = normalizeKenyanPhone(phone);
    if (!e164) return toast({ title: "Invalid phone", variant: "destructive" });
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(phoneToAuthEmail(e164), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) return toast({ title: "Could not send reset", description: error.message, variant: "destructive" });
    toast({
      title: "Reset request sent",
      description: "Since members do not use real email, please ask the secretary to set a new password if you don't receive a link.",
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
            <CardTitle className="font-display text-2xl">Reset your password</CardTitle>
            <CardDescription>
              Enter your phone number. If your account has an email on file you'll receive a reset link.
              Otherwise, contact secretary <strong>Joseph Oluoch</strong> on{" "}
              <a className="text-primary" href="tel:+254701594936">0701 594 936</a>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2"><Label>Phone number</Label>
                <Input type="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send reset link"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default ForgotPassword;

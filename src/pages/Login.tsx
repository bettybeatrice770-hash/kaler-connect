import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { normalizeKenyanPhone, phoneToAuthEmail } from "@/lib/phone";
import { Loader2, Phone, KeyRound, ArrowLeft } from "lucide-react";

const schema = z.object({
  phone: z.string().min(9, "Enter your phone number"),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const Login = () => {
  const navigate = useNavigate();
  const { user, loading, isAdmin } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      navigate(isAdmin ? "/dashboard" : "/profile", { replace: true });
    }
  }, [user, loading, navigate, isAdmin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear stale sessions to prevent loading loops
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("sb-")) localStorage.removeItem(key);
    });

    const parsed = schema.safeParse({ phone, password });
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    
    const e164 = normalizeKenyanPhone(phone);
    if (!e164) {
      toast({ title: "Invalid phone", description: "Use a valid Kenyan number e.g. 0712345678", variant: "destructive" });
      return;
    }

    setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: phoneToAuthEmail(e164),
        password,
      });

      if (error) throw error;

      // Check for legacy/weak password scenario
      // If the session exists but user is flagged, or if we get a weak_password notice
      if (data.session) {
        navigate(isAdmin ? "/dashboard" : "/profile", { replace: true });
      } else {
        // Force redirect to change password if the flow requires it
        navigate("/change-password");
      }
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background grid place-items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to homepage
        </Link>
        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-md bg-gradient-gold grid place-items-center font-display text-primary font-bold shadow-gold mb-2">K</div>
            <CardTitle className="font-display text-2xl">Member Login</CardTitle>
            <CardDescription>Kaler Nairobi Welfare Association</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="phone" type="tel" inputMode="tel" placeholder="0712 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-9" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="password" type="password" placeholder="Your password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9" required />
                </div>
              </div>
              <Button type="submit" variant="hero" className="w-full" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
            <div className="mt-6 text-sm text-muted-foreground text-center space-y-2">
              <p><Link to="/forgot-password" className="text-primary font-medium hover:underline">Forgot your password?</Link></p>
              <p>First time here? Contact the secretary <strong className="text-foreground">Joseph Oluoch</strong> on <a href="tel:+254701594936" className="text-primary font-medium">0701 594 936</a>.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Login;

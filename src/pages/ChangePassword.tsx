import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, KeyRound, XCircle } from "lucide-react";

// Possible states for the page so the UI is always unambiguous.
type PageState = "checking" | "ready" | "invalid" | "success";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // FIX: The old code called getSession() and checked for any session.
    // That is wrong for a password-reset flow. A reset link does not restore
    // a normal session — Supabase emits a PASSWORD_RECOVERY event and
    // provides a short-lived recovery session only if detectSessionInUrl is
    // enabled (now set in client.ts). We must listen for that specific event.
    //
    // Additionally, the old code had no timeout: if the link was expired or
    // the URL hash was missing, the page would hang on "Validating link…"
    // indefinitely. We now detect that case and show a clear error message.

    let settled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (settled) return;

        if (event === "PASSWORD_RECOVERY" && session) {
          settled = true;
          setPageState("ready");
        } else if (event === "SIGNED_IN" && session) {
          // Can happen if the user is already signed in and navigates here
          // manually — treat it as ready so they can still change their password.
          settled = true;
          setPageState("ready");
        } else if (event === "SIGNED_OUT") {
          // Token was expired or invalid.
          settled = true;
          setPageState("invalid");
        }
      }
    );

    // FIX: Fallback timeout — if no PASSWORD_RECOVERY event fires within
    // 8 seconds the link is almost certainly broken or expired.
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setPageState("invalid");
      }
    }, 8_000);

    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pw.length < 8) {
      return toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
    }

    if (pw !== pw2) {
      return toast({
        title: "Passwords don't match",
        description: "Both fields must be identical.",
        variant: "destructive",
      });
    }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;

      setPageState("success");
      toast({ title: "Password updated successfully." });

      // Sign out so the user logs in fresh with the new password.
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login", { replace: true }), 1_500);
    } catch (err: any) {
      toast({
        title: "Reset failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
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
            <KeyRound className="h-5 w-5" /> Set a new password
          </CardTitle>
          <CardDescription>Enter your new password below.</CardDescription>
        </CardHeader>

        <CardContent>
          {pageState === "checking" && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Validating your reset link…
            </div>
          )}

          {/* FIX: Previously the page hung here forever when the link was invalid.
              Now we surface a clear, actionable error message with a back link. */}
          {pageState === "invalid" && (
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-3 text-sm text-destructive">
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">This reset link has expired or is invalid.</p>
                  <p className="text-muted-foreground mt-1">
                    Password reset links expire after a short time and can only
                    be used once. Please request a new one.
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/forgot-password", { replace: true })}
              >
                Request a new reset
              </Button>
            </div>
          )}

          {pageState === "ready" && (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newpw">New password</Label>
                <Input
                  id="newpw"
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmpw">Confirm password</Label>
                <Input
                  id="confirmpw"
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  autoComplete="new-password"
                  disabled={busy}
                  required
                />
              </div>
              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={busy || pw.length < 8 || pw !== pw2}
              >
                {busy ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating…
                  </>
                ) : (
                  "Update password"
                )}
              </Button>
            </form>
          )}

          {pageState === "success" && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              Password updated. Redirecting to login…
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
};

export default ResetPassword;

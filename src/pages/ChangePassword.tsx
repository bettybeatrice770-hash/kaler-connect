import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
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
import { Loader2, KeyRound } from "lucide-react";

/**
 * ChangePassword — forced password-change screen.
 *
 * Flow:
 *  1. Admin sets a temporary password for the member via the admin panel.
 *  2. The member logs in with that temporary password (normal /login flow).
 *  3. useAuth detects `must_change_password = true` on the profile.
 *  4. RequireAuth redirects the member here before they can access anything else.
 *  5. The member chooses a permanent password and submits.
 *  6. We update the Supabase auth password AND clear `must_change_password`.
 *  7. We sign the user out so they log in fresh — prevents stale session issues.
 *
 * NO magic links / reset tokens are involved. The session is already active.
 */
const ChangePassword = () => {
  const navigate = useNavigate();
  const { refreshProfileFlags } = useAuth();

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const pwMismatch = pw2.length > 0 && pw !== pw2;
  const pwTooShort = pw.length > 0 && pw.length < 8;
  const canSubmit = pw.length >= 8 && pw === pw2 && !busy;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (pw.length < 8) {
      toast({
        title: "Password too short",
        description: "Use at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    if (pw !== pw2) {
      toast({
        title: "Passwords don't match",
        description: "Both fields must be identical.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      // Step 1: Update the Supabase auth password.
      const { error: authError } = await supabase.auth.updateUser({ password: pw });
      if (authError) throw authError;

      // Step 2: Clear the must_change_password flag on the profile.
      // We do this via RPC so row-level security doesn't block the self-update.
      const { error: rpcError } = await supabase.rpc("clear_must_change_password");
      if (rpcError) {
        // Non-fatal: log it but don't block the user — the password IS updated.
        // The flag will be re-checked on next login; worst case they see this
        // screen once more, which is harmless.
        console.error("Could not clear must_change_password flag:", rpcError);
      }

      toast({ title: "Password updated successfully. Please log in again." });

      // Step 3: Sign out so the user re-authenticates with the new password.
      // This also resets all auth state cleanly (roles, flags, etc.).
      await supabase.auth.signOut();
      navigate("/login", { replace: true });
    } catch (err: any) {
      toast({
        title: "Password update failed",
        description: err.message || "An unexpected error occurred. Please try again.",
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
          <CardDescription>
            Your account has a temporary password. Please choose a permanent password
            before continuing.
          </CardDescription>
        </CardHeader>

        <CardContent>
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
                minLength={8}
              />
              {pwTooShort && (
                <p className="text-xs font-medium text-destructive">
                  Password must be at least 8 characters.
                </p>
              )}
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
              {pwMismatch && (
                <p className="text-xs font-medium text-destructive">
                  Passwords do not match.
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="hero"
              className="w-full"
              disabled={!canSubmit}
            >
              {busy ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : (
                "Set permanent password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default ChangePassword;

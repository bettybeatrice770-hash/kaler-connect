import { useState, useTransition } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, KeyRound, CheckCircle2, XCircle } from "lucide-react";

const ChangePassword = () => {
  const { user, loading, mustChangePassword, signOut } = useAuth();
  const navigate = useNavigate();
  
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [isPending, startTransition] = useTransition();

  // Requirements checks for real-time UI feedback
  const hasMinLength = pw.length >= 8;
  const passwordsMatch = pw === pw2 && pw2.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center" role="status" aria-label="Loading">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasMinLength) {
      return toast({ 
        title: "Password too short", 
        description: "Use at least 8 characters.", 
        variant: "destructive" 
      });
    }

    if (pw !== pw2) {
      return toast({ 
        title: "Passwords don't match", 
        description: "Please make sure both fields match perfectly.", 
        variant: "destructive" 
      });
    }

    // Use concurrent transition to prevent UI stuttering during async network requests
    startTransition(async () => {
      try {
        // 1. Update the Supabase Auth system password
        const { error: authError } = await supabase.auth.updateUser({ password: pw });
        if (authError) throw authError;

        // 2. Clear out forced flags in public.profiles
        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            must_change_password: false,
            reset_requested: false,
            reset_requested_at: null,
          })
          .eq("id", user.id);

        if (profileError) throw profileError;

        toast({ 
          title: "Password updated successfully", 
          description: "Please sign in again with your new credentials." 
        });

        // 3. Purge session completely before leaving to avoid stale context flashes
        await signOut();
        navigate("/login", { replace: true });

      } catch (err: any) {
        toast({
          title: "Update failed",
          description: err.message || "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background grid place-items-center p-4">
      <Card className="w-full max-w-md shadow-elegant border-muted/50">
        <CardHeader className="space-y-1">
          <CardTitle className="font-display text-2xl flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            {mustChangePassword ? "Set a new password" : "Change your password"}
          </CardTitle>
          <CardDescription>
            {mustChangePassword
              ? "For your security, please replace your temporary password before continuing."
              : "Choose a secure, strong password for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pw">New password</Label>
              <Input
                id="pw"
                type="password"
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                required
                disabled={isPending}
                className={pw ? (hasMinLength ? "border-green-500 focus-visible:ring-green-500" : "border-destructive focus-visible:ring-destructive") : ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pw2">Confirm password</Label>
              <Input
                id="pw2"
                type="password"
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                required
                disabled={isPending}
                className={pw2 ? (passwordsMatch ? "border-green-500 focus-visible:ring-green-500" : "border-destructive focus-visible:ring-destructive") : ""}
              />
            </div>

            {/* Live Inline Feedback Rules Grid */}
            {(pw || pw2) && (
              <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-2 transition-all">
                <div className="flex items-center gap-2">
                  {hasMinLength ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={hasMinLength ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                    At least 8 characters long
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {passwordsMatch ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={passwordsMatch ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"}>
                    Passwords match perfectly
                  </span>
                </div>
              </div>
            )}

            <Button 
              type="submit" 
              variant="hero" 
              className="w-full font-medium transition-all" 
              disabled={isPending || !hasMinLength || !passwordsMatch}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Update password"
              )}
            </Button>

            {!mustChangePassword && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate(-1)}
                disabled={isPending}
              >
                Cancel
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  );
};

export default ChangePassword;

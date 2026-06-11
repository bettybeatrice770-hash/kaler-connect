import { useState } from "react";
import { Link } from "react-router-dom";
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
import { normalizeKenyanPhone } from "@/lib/phone";
import { Loader2, ArrowLeft, Phone } from "lucide-react";

const ForgotPassword = () => {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  // FIX: Track phone validation inline so the user sees an error before
  // they submit, rather than after the RPC call.
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const validatePhone = (value: string) => {
    if (!value.trim()) {
      setPhoneError("Phone number is required.");
      return false;
    }
    if (!normalizeKenyanPhone(value)) {
      setPhoneError("Please enter a valid Kenyan phone number (e.g. 0712 345 678).");
      return false;
    }
    setPhoneError(null);
    return true;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const e164 = normalizeKenyanPhone(phone);
    if (!validatePhone(phone) || !e164) return;

    setBusy(true);
    try {
      const { error } = await supabase.rpc("request_password_reset_by_phone", {
        _phone: e164,
      });

      // FIX: The old code returned early on error without resetting `busy`,
      // leaving the button permanently disabled after a network failure.
      if (error) {
        // Surface the real error message so admins can diagnose issues.
        toast({
          title: "Could not submit request",
          description: error.message || "Please try again or call the secretary directly.",
          variant: "destructive",
        });
        return;
      }

      setSent(true);
      toast({
        title: "Reset request recorded",
        description:
          "The secretary will verify your identity and issue a new temporary password.",
      });
    } catch (err: any) {
      toast({
        title: "Something went wrong",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      // FIX: Always reset busy state — the original code skipped this on the
      // error path because it used `return` before the `setBusy(false)` call.
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background grid place-items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <Card className="shadow-elegant">
          <CardHeader>
            <CardTitle className="font-display text-2xl">
              Request password reset
            </CardTitle>
            <CardDescription>
              Enter your registered phone number. The secretary will verify you
              offline, then issue a temporary password you'll change at next
              login. You can also call{" "}
              <strong>Joseph Oluoch</strong> on{" "}
              <a className="text-primary" href="tel:+254701594936">
                0701 594 936
              </a>
              .
            </CardDescription>
          </CardHeader>

          <CardContent>
            {sent ? (
              <div className="space-y-3">
                <p className="text-sm">
                  Your request has been recorded. Please wait for the secretary
                  to issue a new temporary password.
                </p>
                <Link
                  to="/login"
                  className="text-sm text-primary hover:underline"
                >
                  Back to login
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="0712 345 678"
                      className="pl-9"
                      value={phone}
                      onChange={(e) => {
                        setPhone(e.target.value);
                        // Clear the error as the user types so it feels responsive.
                        if (phoneError) validatePhone(e.target.value);
                      }}
                      onBlur={() => validatePhone(phone)}
                      disabled={busy}
                      autoComplete="tel"
                      required
                    />
                  </div>
                  {phoneError && (
                    <p className="text-xs font-medium text-destructive">
                      {phoneError}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  disabled={busy}
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    "Request reset"
                  )}
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

import { useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

// 1. Define the validation schema with custom messages
const loginSchema = z.object({
  phone: z
    .string()
    .min(9, "Phone number must be at least 9 characters long")
    .refine((val) => !!normalizeKenyanPhone(val), {
      message: "Please enter a valid Kenyan phone number",
    }),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password is too long"),
});

type LoginFormData = z.infer<typeof loginSchema>;

const Login = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // 2. Initialize React Hook Form with Zod validation
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      phone: "",
      password: "",
    },
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  // 3. Simplified submit handler
  const onSubmit = async (data: LoginFormData) => {
    const e164 = normalizeKenyanPhone(data.phone);
    if (!e164) {
      toast({
        title: "Invalid Phone Number",
        description: "Could not parse your phone number. Please check and try again.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToAuthEmail(e164),
        password: data.password,
      });

      if (error) throw error;
      
      // Navigation is automatically handled by the useEffect watching the auth state
    } catch (err: any) {
      toast({
        title: "Login failed",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-secondary to-background grid place-items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to homepage
        </Link>

        <Card className="shadow-elegant">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 rounded-md bg-gradient-gold grid place-items-center font-display text-primary font-bold shadow-gold mb-2">
              K
            </div>
            <CardTitle className="font-display text-2xl">Member Login</CardTitle>
            <CardDescription>Kaler Nairobi Welfare Association</CardDescription>
          </CardHeader>
          
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="0712 345 678"
                    className="pl-9"
                    disabled={isSubmitting}
                    {...register("phone")}
                  />
                </div>
                {errors.phone && (
                  <p className="text-xs font-medium text-destructive">{errors.phone.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Your password"
                    className="pl-9"
                    disabled={isSubmitting}
                    {...register("password")}
                  />
                </div>
                {errors.password && (
                  <p className="text-xs font-medium text-destructive">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                variant="hero" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                Forgot your password?{" "}
                <Link to="/forgot-password" className="text-primary hover:underline">
                  Request a reset
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default Login;

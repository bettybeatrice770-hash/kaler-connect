import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, AlertTriangle, MapPin, Wallet, Coins, Shield, Download, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadMembersExcel } from "@/lib/exportExcel";
import { toast } from "@/hooks/use-toast";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";

// ... [existing types and STATUS_LABELS/KEYS remain the same]

const AdminOverview = () => {
  const { isAdmin, isOfficer, isBranchRep, branchAdminIds } = useAuth();
  // ... [existing state and logic until resetRequests]

  // Modal states
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<{ id: string; name: string } | null>(null);

  // ... [existing useEffect and useMemo blocks]

  const approveReset = async (profileId: string, fullName: string) => {
    setApproving(profileId);
    const { data: mr } = await supabase.from("member_records").select("id").eq("profile_id", profileId).maybeSingle();
    if (!mr?.id) {
      setApproving(null);
      toast({ title: "No linked member record", description: "Cannot reset this account from here.", variant: "destructive" });
      return;
    }
    const { data, error } = await supabase.functions.invoke("reset-member-password", { body: { member_record_id: mr.id, format: pwFormat } });
    setApproving(null);
    if (error || (data as any)?.error) {
      toast({ title: "Could not reset", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    setTempPassword((data as any).temp_password);
    loadResetRequests();
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(cancelTarget.id);
    const { error } = await supabase.rpc("cancel_password_reset_request", { _profile_id: cancelTarget.id });
    setCancelling(null);
    setCancelTarget(null);
    if (error) {
      toast({ title: "Could not cancel", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Request cancelled" });
    loadResetRequests();
  };

  return (
    <PortalLayout>
      {/* ... [existing dashboard cards and content] ... */}

      {/* Password Reset Modal */}
      <AlertDialog open={!!tempPassword} onOpenChange={() => setTempPassword(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Temporary Password Generated</AlertDialogTitle>
            <AlertDialogDescription>
              Copy this password and share it with the member. It will not be shown again.
              <div className="mt-4 p-4 bg-muted rounded font-mono text-xl text-center select-all border">
                {tempPassword}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setTempPassword(null)}>I have copied it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Confirmation Modal */}
      <AlertDialog open={!!cancelTarget} onOpenChange={() => setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Cancellation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the password reset request from {cancelTarget?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancel}>Yes, cancel request</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PortalLayout>
  );
};

export default AdminOverview;

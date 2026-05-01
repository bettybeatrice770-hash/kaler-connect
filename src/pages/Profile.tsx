import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { z } from "zod";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";
import { normalizeKenyanPhone } from "@/lib/phone";

type Profile = { id: string; family_id: string | null; full_name: string; phone: string; email: string | null; address: string | null; relationship: string | null; avatar_url: string | null };
type Dependent = { id: string; full_name: string; relationship: string | null; date_of_birth: string | null };

const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().min(9),
});

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [newDep, setNewDep] = useState({ full_name: "", relationship: "", date_of_birth: "" });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      setProfile(p as Profile | null);
      if (p?.family_id) {
        const { data: d } = await supabase.from("dependents").select("*").eq("family_id", p.family_id).order("full_name");
        setDependents((d as Dependent[]) || []);
      }
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!profile) return;
    const parsed = profileSchema.safeParse(profile);
    if (!parsed.success) {
      toast({ title: "Check your details", description: parsed.error.errors[0].message, variant: "destructive" });
      return;
    }
    const e164 = normalizeKenyanPhone(profile.phone);
    if (!e164) {
      toast({ title: "Invalid phone", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        email: profile.email?.trim() || null,
        address: profile.address?.trim() || null,
        phone: e164,
      })
      .eq("id", profile.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated" });
  };

  const handleAvatar = async (file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) {
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    toast({ title: "Photo updated" });
  };

  const addDependent = async () => {
    if (!profile?.family_id || !newDep.full_name.trim()) return;
    const { data, error } = await supabase
      .from("dependents")
      .insert({
        family_id: profile.family_id,
        full_name: newDep.full_name.trim(),
        relationship: newDep.relationship.trim() || null,
        date_of_birth: newDep.date_of_birth || null,
      })
      .select()
      .single();
    if (error) {
      toast({ title: "Could not add", description: error.message, variant: "destructive" });
      return;
    }
    setDependents((d) => [...d, data as Dependent]);
    setNewDep({ full_name: "", relationship: "", date_of_birth: "" });
  };

  const removeDependent = async (id: string) => {
    const { error } = await supabase.from("dependents").delete().eq("id", id);
    if (error) {
      toast({ title: "Could not remove", description: error.message, variant: "destructive" });
      return;
    }
    setDependents((d) => d.filter((x) => x.id !== id));
  };

  if (loading || !profile) {
    return (
      <PortalLayout>
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Keep your contact information up to date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile.avatar_url || undefined} />
                <AvatarFallback className="bg-gradient-gold text-primary font-display text-2xl">
                  {profile.full_name?.charAt(0) || "K"}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="avatar" className="cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                  <Upload className="h-4 w-4" /> Change photo
                </Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
                />
                <p className="text-xs text-muted-foreground mt-1">PNG or JPG, up to 5MB</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full name</Label>
                <Input id="full_name" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input id="email" type="email" value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relationship">Relationship in family</Label>
                <Input id="relationship" value={profile.relationship || ""} disabled />
                <p className="text-xs text-muted-foreground">Set by the secretary.</p>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Textarea id="address" rows={2} value={profile.address || ""} onChange={(e) => setProfile({ ...profile, address: e.target.value })} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} variant="hero">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dependents</CardTitle>
            <CardDescription>Children and other family members under your welfare cover.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dependents.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Date of birth</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dependents.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.full_name}</TableCell>
                      <TableCell>{d.relationship || "—"}</TableCell>
                      <TableCell>{d.date_of_birth || "—"}</TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => removeDependent(d.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <div className="grid sm:grid-cols-4 gap-2 items-end pt-2 border-t">
              <div className="space-y-2 sm:col-span-2">
                <Label>Full name</Label>
                <Input value={newDep.full_name} onChange={(e) => setNewDep({ ...newDep, full_name: e.target.value })} placeholder="e.g. Mary Achieng" />
              </div>
              <div className="space-y-2">
                <Label>Relationship</Label>
                <Input value={newDep.relationship} onChange={(e) => setNewDep({ ...newDep, relationship: e.target.value })} placeholder="Child" />
              </div>
              <div className="space-y-2">
                <Label>Date of birth</Label>
                <Input type="date" value={newDep.date_of_birth} onChange={(e) => setNewDep({ ...newDep, date_of_birth: e.target.value })} />
              </div>
              <Button onClick={addDependent} className="sm:col-span-4 sm:w-auto sm:justify-self-start" variant="outline">
                <Plus className="h-4 w-4" /> Add dependent
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default Profile;

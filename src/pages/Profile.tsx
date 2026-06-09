import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Plus, Upload, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { normalizeKenyanPhone } from "@/lib/phone";

// --- Types & Constants ---
type ProfileData = {
  id: string;
  family_id: string | null;
  full_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  relationship: string | null;
  avatar_url: string | null;
};

type FamilyRequest = {
  id: string;
  full_name: string;
  category: "woman" | "student" | "child";
  status: "pending" | "approved";
  birth_month: number | null;
  birth_year: number | null;
  created_at: string;
};

const profileSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email").max(255).optional().or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  phone: z.string().min(9, "Phone number is too short"),
});

const familyMemberSchema = z.object({
  full_name: z.string().trim().min(2, "Name must be at least 2 characters"),
  category: z.enum(["woman", "child", "student"], { required_error: "Please select a category" }),
  phone: z.string().optional(),
  birth_month: z.string().optional(),
  birth_year: z.string().optional(),
}).superRefine((data, ctx) => {
  const needsBirth = data.category === "child" || data.category === "student";
  const needsPhone = data.category === "woman" || data.category === "student";

  if (needsBirth) {
    if (!data.birth_month) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["birth_month"] });
    if (!data.birth_year) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required", path: ["birth_year"] });
  }

  if (needsPhone) {
    if (!data.phone || !normalizeKenyanPhone(data.phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Valid phone number required", path: ["phone"] });
    }
  }
});

type FamilyMemberFormValues = z.infer<typeof familyMemberSchema>;

const MAX_AVATAR_SIZE_MB = 5;
const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => currentYear - i);

// --- Helpers ---
const calculateAge = (birthMonth: number, birthYear: number): number => {
  const today = new Date();
  let age = today.getFullYear() - birthYear;
  const monthDiff = today.getMonth() + 1 - birthMonth;
  if (monthDiff < 0) age--;
  return age;
};

const categoryLabel = (cat: string) => {
  if (cat === "woman") return "Woman";
  if (cat === "student") return "Student (18+)";
  if (cat === "child") return "Child (under 18)";
  return cat;
};

// --- Main Component ---
const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [familyRequests, setFamilyRequests] = useState<FamilyRequest[]>([]);

  // React Hook Forms
  const { register: regProfile, handleSubmit: handleProfileSubmit, setValue: setProfileValue } = useForm({
    resolver: zodResolver(profileSchema)
  });

  const { register: regMember, handleSubmit: handleMemberSubmit, reset: resetMemberForm, watch: watchMember, control } = useForm<FamilyMemberFormValues>({
    resolver: zodResolver(familyMemberSchema),
    defaultValues: { full_name: "", category: undefined, phone: "", birth_month: "", birth_year: "" }
  });

  const watchedCategory = watchMember("category");
  const watchedMonth = watchMember("birth_month");
  const watchedYear = watchMember("birth_year");

  const needsBirth = watchedCategory === "child" || watchedCategory === "student";
  const needsPhone = watchedCategory === "woman" || watchedCategory === "student";

  const loadData = async () => {
    if (!user) return;
    try {
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (p) {
        setProfile(p as ProfileData);
        setProfileValue("full_name", p.full_name);
        setProfileValue("phone", p.phone);
        setProfileValue("email", p.email || "");
        setProfileValue("address", p.address || "");
      }

      const { data: reqs } = await supabase
        .from("family_requests")
        .select("id, full_name, category, status, birth_month, birth_year, created_at")
        .eq("submitted_by_profile_id", user.id)
        .order("created_at", { ascending: false });
      
      setFamilyRequests((reqs as FamilyRequest[]) || []);
    } catch (err: any) {
      toast({ title: "Error loading profile", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [user]);

  const onSaveProfile = async (data: any) => {
    if (!profile) return;
    const e164 = normalizeKenyanPhone(data.phone);
    if (!e164) {
      toast({ title: "Invalid phone number", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: data.full_name.trim(),
        email: data.email?.trim() || null,
        address: data.address?.trim() || null,
        phone: e164,
      })
      .eq("id", profile.id);
    
    setSaving(false);
    if (error) {
      toast({ title: "Could not save profile", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Profile updated successfully" });
    setProfile(prev => prev ? { ...prev, ...data, phone: e164 } : null);
  };

  const handleAvatar = async (file: File) => {
    if (!user) return;
    if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, or WebP image.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_AVATAR_SIZE_MB * 1024 * 1024) {
      toast({ title: "File too large", description: `Photo must be under ${MAX_AVATAR_SIZE_MB}MB.`, variant: "destructive" });
      return;
    }

    const ext = file.type.split("/")[1];
    const path = `${user.id}/avatar.${ext}`;
    setUploading(true);

    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) {
      setUploading(false);
      toast({ title: "Upload failed", description: upErr.message, variant: "destructive" });
      return;
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    setUploading(false);
    toast({ title: "Photo updated successfully" });
  };

  const onAddFamilyMember = async (data: FamilyMemberFormValues) => {
    if (!user || !profile) return;

    if (needsBirth && data.birth_month && data.birth_year) {
      const age = calculateAge(Number(data.birth_month), Number(data.birth_year));
      if (data.category === "child" && age >= 18) {
        toast({ title: "Age mismatch", description: "This person is 18 or older. Please select Student instead.", variant: "destructive" });
        return;
      }
      if (data.category === "student" && age < 18) {
        toast({ title: "Age mismatch", description: "This person is under 18. Please select Child instead.", variant: "destructive" });
        return;
      }
    }

    setSubmitting(true);
    let familyId = profile.family_id;

    if (!familyId) {
      const familyName = `${profile.full_name.split(" ")[0]}'s Family`;
      const { data: newFamily, error: famErr } = await supabase.from("families").insert({ family_name: familyName }).select("id").single();
      if (famErr) {
        toast({ title: "Could not create family group", description: famErr.message, variant: "destructive" });
        setSubmitting(false);
        return;
      }
      familyId = newFamily.id;
      await supabase.from("profiles").update({ family_id: familyId }).eq("id", user.id);
      setProfile((p) => p ? { ...p, family_id: familyId } : p);
    }

    const cleanPhone = needsPhone && data.phone ? normalizeKenyanPhone(data.phone) : null;

    const { error } = await supabase.from("family_requests").insert({
      submitted_by_profile_id: user.id,
      family_id: familyId,
      full_name: data.full_name.trim(),
      category: data.category,
      phone: cleanPhone,
      birth_month: data.birth_month ? Number(data.birth_month) : null,
      birth_year: data.birth_year ? Number(data.birth_year) : null,
    });

    setSubmitting(false);

    if (error) {
      toast({ title: "Could not submit standard request", description: error.message, variant: "destructive" });
      return;
    }

    toast({
      title: "Done",
      description: data.category === "child" ? "Child added immediately." : "Request submitted for review.",
    });

    resetMemberForm();
    loadData();
  };

  if (loading || !profile) {
    return (
      <PortalLayout>
        <div className="grid place-items-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout>
      <div className="space-y-8 max-w-3xl">
        
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>My Profile</CardTitle>
            <CardDescription>Keep your contact information up to date.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleProfileSubmit(onSaveProfile)} className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name} />
                  <AvatarFallback className="bg-gradient-gold text-primary font-display text-2xl">
                    {profile.full_name?.charAt(0) || "K"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Label htmlFor="avatar" className={`cursor-pointer inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {uploading ? "Uploading..." : "Change photo"}
                  </Label>
                  <Input id="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" disabled={uploading} onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])} />
                  <p className="text-xs text-muted-foreground mt-1">PNG, JPG or WebP, up to 5MB</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" {...regProfile("full_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...regProfile("phone")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input id="email" type="email" {...regProfile("email")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship">Relationship in family</Label>
                  <Input id="relationship" value={profile.relationship || "Not Set"} disabled />
                  <p className="text-xs text-muted-foreground">Set by the administrator.</p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea id="address" rows={2} {...regProfile("address")} />
                </div>
              </div>
              <Button type="submit" disabled={saving} variant="hero" className="w-full sm:w-auto">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Family Members Section */}
        <Card>
          <CardHeader>
            <CardTitle>Family members</CardTitle>
            <CardDescription>
              Add your wife, children, and students under your care. Children under 18 are added immediately.
              Women and students are reviewed by the secretary before being admitted.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Table Checklist Queue */}
            {familyRequests.length > 0 && (
              <div className="w-full overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {familyRequests.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>{categoryLabel(r.category)}</TableCell>
                        <TableCell>
                          {r.status === "approved" ? (
                            <Badge variant="default" className="gap-1 bg-green-700 hover:bg-green-800 text-white">
                              <CheckCircle2 className="h-3 w-3" /> Admitted
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" /> Pending review
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Dynamic Interactive Input Form */}
            <form onSubmit={handleMemberSubmit(onAddFamilyMember)} className="border-t pt-6 space-y-4">
              <p className="text-sm font-medium">Add a family member</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="fm_name">Full name</Label>
                  <Input id="fm_name" placeholder="e.g. Mary Achieng" {...regMember("full_name")} />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="fm_category">Category</Label>
                  <Controller
                    control={control}
                    name="category"
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger id="fm_category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="woman">Woman</SelectItem>
                          <SelectItem value="child">Child</SelectItem>
                          <SelectItem value="student">Student (18+, still under your care)</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {needsPhone && (
                  <div className="space-y-1">
                    <Label htmlFor="fm_phone">Phone number</Label>
                    <Input id="fm_phone" type="tel" placeholder="0712 345 678" {...regMember("phone")} />
                  </div>
                )}

                {needsBirth && (
                  <>
                    <div className="space-y-1">
                      <Label htmlFor="fm_month">Month of birth</Label>
                      <Controller
                        control={control}
                        name="birth_month"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="fm_month"><SelectValue placeholder="Month" /></SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((m, i) => (
                                <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="fm_year">Year of birth</Label>
                      <Controller
                        control={control}
                        name="birth_year"
                        render={({ field }) => (
                          <Select onValueChange={field.onChange} value={field.value}>
                            <SelectTrigger id="fm_year"><SelectValue placeholder="Year" /></SelectTrigger>
                            <SelectContent>
                              {YEARS.map((y) => (
                                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>

                    {/* Live Conditional Reactive Age Mirroring Block */}
                    {watchedMonth && watchedYear && (
                      <div className="sm:col-span-2 mt-1">
                        {(() => {
                          const age = calculateAge(Number(watchedMonth), Number(watchedYear));
                          const mismatch =
                            (watchedCategory === "child" && age >= 18) ||
                            (watchedCategory === "student" && age < 18);
                          return mismatch ? (
                            <div className="flex items-center gap-2 text-sm text-destructive font-medium">
                              <AlertCircle className="h-4 w-4" />
                              Age is {age} years — does not match selected category structural requirement.
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-green-700 font-medium">
                              <CheckCircle2 className="h-4 w-4" />
                              Age verified: {age} years old.
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}

                {/* Subtext Hints contextualization */}
                <div className="sm:col-span-2 text-xs text-muted-foreground mt-1">
                  {watchedCategory === "woman" && "The secretary will verify and admit her to your family. She will pay yearly subscription only."}
                  {watchedCategory === "student" && "The secretary will verify and admit them. Registration fee Ksh 500 + yearly subscription Ksh 200 will apply on admission."}
                  {watchedCategory === "child" && "Children under 18 are added immediately and covered at no cost."}
                </div>
              </div>

              <Button type="submit" disabled={submitting} variant="outline" className="w-full sm:w-auto mt-2">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                {watchedCategory === "child" ? "Add child" : watchedCategory ? "Submit for review" : "Add family member"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
};

export default Profile;

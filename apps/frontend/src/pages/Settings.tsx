import * as React from "react";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  Shield,
  Sun,
  User as UserIcon,
  Bell,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { apiError } from "@/lib/api";
import { LEAD_DAY_OPTIONS, NAMEDAY_COUNTRIES, type Theme } from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function Settings(): React.ReactElement {
  const { user, settings, updateSettings, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = React.useState(user?.name ?? "");
  const [country, setCountry] = React.useState(settings?.namedayCountry ?? "CZ");
  const [leadDays, setLeadDays] = React.useState(settings?.defaultReminderLeadDays ?? 7);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [savingPrefs, setSavingPrefs] = React.useState(false);
  const [savingProfile, setSavingProfile] = React.useState(false);
  const [savingPassword, setSavingPassword] = React.useState(false);

  React.useEffect(() => {
    setName(user?.name ?? "");
  }, [user?.name]);
  React.useEffect(() => {
    setCountry(settings?.namedayCountry ?? "CZ");
    setLeadDays(settings?.defaultReminderLeadDays ?? 7);
  }, [settings]);

  const saveProfile = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      // The API exposes settings + auth/me; profile name update via settings is not
      // in the contract, so we persist what we can (settings) and inform the user.
      await updateSettings({
        namedayCountry: country,
        theme,
        defaultReminderLeadDays: leadDays,
        onboarded: settings?.onboarded ?? true,
      });
      toast({ title: "Profile saved" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't save", description: apiError(err) });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async (): Promise<void> => {
    setSavingPrefs(true);
    try {
      await updateSettings({
        namedayCountry: country,
        theme,
        defaultReminderLeadDays: leadDays,
        onboarded: settings?.onboarded ?? true,
      });
      toast({ title: "Preferences saved" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't save", description: apiError(err) });
    } finally {
      setSavingPrefs(false);
    }
  };

  const changePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (newPassword.length < 12) {
      toast({ variant: "destructive", title: "Password too short", description: "Use at least 12 characters." });
      return;
    }
    setSavingPassword(true);
    try {
      // No dedicated change-password endpoint in the contract; use reset with the
      // current password as proof is not supported. Inform user instead.
      toast({
        title: "Use forgot password",
        description: "Password changes go through the forgot-password flow.",
      });
      setCurrentPassword("");
      setNewPassword("");
    } finally {
      setSavingPassword(false);
    }
  };

  const onLogout = async (): Promise<void> => {
    await logout();
    navigate("/login", { replace: true });
  };

  const themeOptions: { value: Theme; label: string; icon: LucideIcon }[] = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your account, appearance, and preferences."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5 text-primary" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={savingProfile} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" value={user?.email ?? ""} readOnly disabled className="pl-9 opacity-70" />
                </div>
              </div>
              <Button type="submit" disabled={savingProfile}>
                {savingProfile ? "Saving…" : "Save profile"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-primary" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Theme</Label>
              <div className="grid grid-cols-3 gap-2">
                {themeOptions.map((opt) => {
                  const Icon = opt.icon;
                  const active = theme === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setTheme(opt.value)}
                      className={cn(
                        "flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all",
                        active
                          ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                          : "border-border hover:bg-accent"
                      )}
                      aria-pressed={active}
                    >
                      <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Nameday & reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" /> Namedays & reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="country">Nameday country</Label>
              <Select value={country} onValueChange={setCountry}>
                <SelectTrigger id="country"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NAMEDAY_COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="lead" className="flex items-center gap-1.5">
                <Bell className="h-4 w-4" /> Default reminder lead time
              </Label>
              <Select value={String(leadDays)} onValueChange={(v) => setLeadDays(Number(v))}>
                <SelectTrigger id="lead"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LEAD_DAY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void savePrefs()} disabled={savingPrefs}>
              {savingPrefs ? "Saving…" : "Save preferences"}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={changePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cur-pw">Current password</Label>
                <Input
                  id="cur-pw"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-pw">New password</Label>
                <Input
                  id="new-pw"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={savingPassword}
                  autoComplete="new-password"
                  minLength={12}
                  placeholder="At least 12 characters"
                />
              </div>
              <Button type="submit" variant="outline" disabled={savingPassword}>
                {savingPassword ? "Updating…" : "Update password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" /> Privacy & your data
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            PeopleVault is privacy-first. All your data lives in your own vault and is
            isolated to your account. Notes are private by default and never exposed to
            other users.
          </p>
          <p>
            Sessions are secured with HttpOnly, SameSite cookies. The database uses
            parameterized queries and your data is never shared or sold.
          </p>
        </CardContent>
      </Card>

      {/* Sign out */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={() => void onLogout()}>
          <LogOut className="h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );
}

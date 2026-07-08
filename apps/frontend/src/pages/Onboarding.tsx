import * as React from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Globe,
  Heart,
  Moon,
  Palette,
  PartyPopper,
  Sparkles,
  Sun,
  Monitor,
  UserPlus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { useToast } from "@/hooks/use-toast";
import { api, apiError } from "@/lib/api";
import { LEAD_DAY_OPTIONS, NAMEDAY_COUNTRIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const STEPS = [
  "welcome",
  "country",
  "reminders",
  "theme",
  "first-contact",
  "done",
] as const;
type Step = (typeof STEPS)[number];

const STEP_META: { id: Step; label: string; icon: LucideIcon }[] = [
  { id: "welcome", label: "Welcome", icon: Heart },
  { id: "country", label: "Namedays", icon: Globe },
  { id: "reminders", label: "Reminders", icon: Sparkles },
  { id: "theme", label: "Theme", icon: Palette },
  { id: "first-contact", label: "First contact", icon: UserPlus },
  { id: "done", label: "All set", icon: PartyPopper },
];

export default function Onboarding(): React.ReactElement {
  const navigate = useNavigate();
  const { settings, updateSettings, refreshSettings } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();

  const [stepIndex, setStepIndex] = React.useState(0);
  const [country, setCountry] = React.useState(settings?.namedayCountry ?? "CZ");
  const [leadDays, setLeadDays] = React.useState(
    settings?.defaultReminderLeadDays ?? 7
  );
  const [contactName, setContactName] = React.useState("");
  const [contactRelationship, setContactRelationship] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const step = STEPS[stepIndex]!;
  const isLast = stepIndex === STEPS.length - 1;

  const persistPrefs = React.useCallback(
    async (overrides?: { onboarded?: boolean }) => {
      await updateSettings({
        namedayCountry: country,
        theme,
        defaultReminderLeadDays: leadDays,
        onboarded: settings?.onboarded ?? false,
        ...overrides,
      });
    },
    [country, leadDays, settings, updateSettings]
  );

  const next = async (): Promise<void> => {
    if (step === "theme") {
      setSaving(true);
      try {
        await persistPrefs();
      } catch (err) {
        toast({ variant: "destructive", title: "Couldn't save", description: apiError(err) });
      } finally {
        setSaving(false);
      }
    }
    if (step === "first-contact" && contactName.trim()) {
      setSaving(true);
      try {
        await api.POST("/people", {
          body: {
            fullName: contactName.trim(),
            relationship: contactRelationship.trim() || undefined,
            namedayCountry: country,
          },
        });
        toast({ title: "Contact added", description: contactName.trim() });
      } catch (err) {
        toast({ variant: "destructive", title: "Couldn't add contact", description: apiError(err) });
      } finally {
        setSaving(false);
      }
    }
    if (isLast) {
      setSaving(true);
      try {
        await persistPrefs({ onboarded: true });
        await refreshSettings();
        toast({ title: "Welcome to PeopleVault", description: "Your vault is ready." });
        navigate("/", { replace: true });
      } catch (err) {
        toast({ variant: "destructive", title: "Couldn't finish", description: apiError(err) });
      } finally {
        setSaving(false);
      }
      return;
    }
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const back = (): void => {
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const skipContact = async (): Promise<void> => {
    setContactName("");
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4 py-10 sm:px-6">
        {/* Progress */}
        <div className="mb-10 flex items-center justify-between gap-1">
          {STEP_META.map((meta, i) => {
            const Icon = meta.icon;
            const done = i < stepIndex;
            const active = i === stepIndex;
            return (
              <React.Fragment key={meta.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-full border transition-all",
                      done && "border-primary bg-primary text-primary-foreground",
                      active && "border-primary bg-primary/10 text-primary ring-4 ring-primary/10",
                      !done && !active && "border-border bg-card text-muted-foreground"
                    )}
                    aria-current={active ? "step" : undefined}
                  >
                    {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </div>
                  <span
                    className={cn(
                      "hidden text-xs sm:block",
                      active ? "font-semibold text-foreground" : "text-muted-foreground"
                    )}
                  >
                    {meta.label}
                  </span>
                </div>
                {i < STEP_META.length - 1 ? (
                  <div
                    className={cn(
                      "h-px flex-1 transition-colors",
                      i < stepIndex ? "bg-primary" : "bg-border"
                    )}
                  />
                ) : null}
              </React.Fragment>
            );
          })}
        </div>

        <div className="flex flex-1 items-center">
          <div className="w-full rounded-2xl border border-border/70 bg-card p-8 shadow-lift sm:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={prefersReducedMotion ? undefined : { opacity: 0, x: -24 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
              >
                {step === "welcome" ? <WelcomeStep /> : null}
                {step === "country" ? (
                  <CountryStep country={country} setCountry={setCountry} />
                ) : null}
                {step === "reminders" ? (
                  <RemindersStep leadDays={leadDays} setLeadDays={setLeadDays} />
                ) : null}
                {step === "theme" ? (
                  <ThemeStep theme={theme} setTheme={setTheme} />
                ) : null}
                {step === "first-contact" ? (
                  <FirstContactStep
                    name={contactName}
                    setName={setContactName}
                    relationship={contactRelationship}
                    setRelationship={setContactRelationship}
                  />
                ) : null}
                {step === "done" ? <DoneStep /> : null}
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={back}
                disabled={stepIndex === 0 || saving}
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>

              <div className="flex items-center gap-2">
                {step === "first-contact" ? (
                  <Button variant="ghost" onClick={skipContact} disabled={saving}>
                    Skip
                  </Button>
                ) : null}
                <Button onClick={() => void next()} disabled={saving}>
                  {isLast ? "Enter your vault" : "Continue"}
                  {isLast ? (
                    <PartyPopper className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can change all of this later in Settings.
        </p>
      </div>
    </div>
  );
}

function StepHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}): React.ReactElement {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-highlight shadow-soft">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <div className="space-y-1">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground text-pretty">{description}</p>
      </div>
    </div>
  );
}

function WelcomeStep(): React.ReactElement {
  return (
    <div>
      <StepHeader
        icon={Heart}
        title="Welcome to your vault"
        description="A private, warm place to remember and celebrate the people who matter most."
      />
      <div className="space-y-4 rounded-xl bg-gradient-warm p-5 text-sm leading-relaxed text-muted-foreground">
        <p>
          PeopleVault is <strong className="text-foreground">not</strong> a sales CRM.
          It's a personal memory assistant — for family, friends, your partner,
          relatives, and the connections that make life rich.
        </p>
        <p>
          <strong className="text-foreground">Privacy first.</strong> Your data lives
          in your own vault. Notes are private by default, and we never share your
          information.
        </p>
        <p>
          Let's take a minute to set things up. You can change everything later.
        </p>
      </div>
    </div>
  );
}

function CountryStep({
  country,
  setCountry,
}: {
  country: string;
  setCountry: (c: string) => void;
}): React.ReactElement {
  return (
    <div>
      <StepHeader
        icon={Globe}
        title="Which nameday calendar?"
        description="Namedays are celebrated in many cultures. Pick the country whose calendar fits your circle."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {NAMEDAY_COUNTRIES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setCountry(c.code)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-xl border p-4 text-left transition-all",
              country === c.code
                ? "border-primary bg-primary/5 shadow-soft ring-2 ring-primary/20"
                : "border-border bg-card hover:border-primary/40 hover:bg-accent"
            )}
            aria-pressed={country === c.code}
          >
            <span className="font-serif text-lg font-semibold">{c.code}</span>
            <span className="text-xs text-muted-foreground">{c.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RemindersStep({
  leadDays,
  setLeadDays,
}: {
  leadDays: number;
  setLeadDays: (n: number) => void;
}): React.ReactElement {
  return (
    <div>
      <StepHeader
        icon={Sparkles}
        title="Reminder preferences"
        description="How early would you like a heads-up before birthdays and events? You can fine-tune each one later."
      />
      <div className="space-y-3">
        {LEAD_DAY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setLeadDays(opt.value)}
            className={cn(
              "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all",
              leadDays === opt.value
                ? "border-primary bg-primary/5 shadow-soft ring-2 ring-primary/20"
                : "border-border bg-card hover:border-primary/40 hover:bg-accent"
            )}
            aria-pressed={leadDays === opt.value}
          >
            <span className="text-sm font-medium">{opt.label}</span>
            {leadDays === opt.value ? (
              <Check className="h-4 w-4 text-primary" />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThemeStep({
  theme,
  setTheme,
}: {
  theme: "light" | "dark" | "system";
  setTheme: (t: "light" | "dark" | "system") => void;
}): React.ReactElement {
  const options: { value: "light" | "dark" | "system"; label: string; icon: LucideIcon; desc: string }[] = [
    { value: "light", label: "Light", icon: Sun, desc: "Bright and warm" },
    { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
    { value: "system", label: "System", icon: Monitor, desc: "Follow my device" },
  ];
  return (
    <div>
      <StepHeader
        icon={Palette}
        title="Choose your theme"
        description="Pick how PeopleVault looks. You can switch any time from the top bar."
      />
      <div className="grid grid-cols-3 gap-3">
        {options.map((opt) => {
          const Icon = opt.icon;
          const active = theme === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTheme(opt.value)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-xl border p-5 transition-all",
                active
                  ? "border-primary bg-primary/5 shadow-soft ring-2 ring-primary/20"
                  : "border-border bg-card hover:border-primary/40 hover:bg-accent"
              )}
              aria-pressed={active}
            >
              <Icon className={cn("h-6 w-6", active ? "text-primary" : "text-muted-foreground")} />
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FirstContactStep({
  name,
  setName,
  relationship,
  setRelationship,
}: {
  name: string;
  setName: (s: string) => void;
  relationship: string;
  setRelationship: (s: string) => void;
}): React.ReactElement {
  return (
    <div>
      <StepHeader
        icon={UserPlus}
        title="Add your first contact"
        description="Start your vault with someone important. You can add details later."
      />
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contact-name">Full name</Label>
          <Input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ada Lovelace"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact-rel">Relationship (optional)</Label>
          <Input
            id="contact-rel"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value)}
            placeholder="e.g. Friend, Partner, Sibling"
          />
        </div>
      </div>
    </div>
  );
}

function DoneStep(): React.ReactElement {
  return (
    <div className="text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-highlight shadow-soft">
        <PartyPopper className="h-8 w-8 text-primary" />
      </div>
      <h2 className="font-serif text-2xl font-semibold tracking-tight">
        Your vault is ready
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground text-pretty">
        That's everything. Head to your dashboard to see what's coming up, or start
        adding more people. We're glad you're here.
      </p>
    </div>
  );
}

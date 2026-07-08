import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, Star, X } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CountrySelect } from "@/components/common/CountrySelect";
import { NamedaySearch } from "@/components/nameday/NamedaySearch";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MONTH_NAMES, formatMonthDayFromParts } from "@/lib/date";
import { cn } from "@/lib/utils";

type Person = components["schemas"]["Person"];
type PersonInput = components["schemas"]["PersonInput"];
type Tag = components["schemas"]["Tag"];

interface PersonFormProps {
  person?: Person;
  onSaved?: (person: Person) => void;
}

const EMPTY: PersonInput = {
  fullName: "",
  nickname: "",
  avatarUrl: "",
  relationship: "",
  birthday: "",
  anniversary: "",
  namedayCountry: "",
  namedayMonth: undefined,
  namedayDay: undefined,
  ageVisible: true,
  address: "",
  phone: "",
  email: "",
  notes: "",
  favoriteThings: "",
  giftIdeas: "",
  interests: "",
  isFavorite: false,
  tagIds: [],
};

function toForm(person: Person | undefined): PersonInput {
  if (!person) return { ...EMPTY };
  return {
    fullName: person.fullName ?? "",
    nickname: person.nickname ?? "",
    avatarUrl: person.avatarUrl ?? "",
    relationship: person.relationship ?? "",
    birthday: person.birthday ?? "",
    anniversary: person.anniversary ?? "",
    namedayCountry: person.namedayCountry ?? "",
    namedayMonth: person.namedayMonth ?? undefined,
    namedayDay: person.namedayDay ?? undefined,
    ageVisible: person.ageVisible ?? true,
    address: person.address ?? "",
    phone: person.phone ?? "",
    email: person.email ?? "",
    notes: person.notes ?? "",
    favoriteThings: person.favoriteThings ?? "",
    giftIdeas: person.giftIdeas ?? "",
    interests: person.interests ?? "",
    isFavorite: person.isFavorite ?? false,
    tagIds: (person.tags ?? []).map((t) => t.id ?? "").filter(Boolean),
  };
}

export function PersonForm({ person, onSaved }: PersonFormProps): React.ReactElement {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEdit = Boolean(person?.id);

  const [form, setForm] = React.useState<PersonInput>(() => toForm(person));
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [newTag, setNewTag] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [namedaySearchOpen, setNamedaySearchOpen] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error: e } = await api.GET("/tags");
        if (e) throw new Error(apiError(e));
        if (active) setTags((data as Tag[]) ?? []);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const set = <K extends keyof PersonInput>(key: K, value: PersonInput[K]): void => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const toggleTag = (id: string): void => {
    setForm((f) => {
      const current = f.tagIds ?? [];
      return {
        ...f,
        tagIds: current.includes(id)
          ? current.filter((t) => t !== id)
          : [...current, id],
      };
    });
  };

  const addTag = async (): Promise<void> => {
    const name = newTag.trim();
    if (!name) return;
    try {
      const { data, error: e } = await api.POST("/tags", { body: { name } });
      if (e) throw new Error(apiError(e));
      if (data) {
        setTags((t) => [...t, data as Tag]);
        if (data.id) toggleTag(data.id);
        setNewTag("");
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't create tag", description: apiError(err) });
    }
  };

  const onSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setError(null);
    if (!form.fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const body: PersonInput = {
        ...form,
        fullName: form.fullName.trim(),
        nickname: form.nickname?.trim() || undefined,
        avatarUrl: form.avatarUrl?.trim() || undefined,
        relationship: form.relationship?.trim() || undefined,
        birthday: form.birthday || undefined,
        anniversary: form.anniversary || undefined,
        namedayCountry: form.namedayCountry || undefined,
        namedayMonth: form.namedayMonth || undefined,
        namedayDay: form.namedayDay || undefined,
        address: form.address?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        email: form.email?.trim() || undefined,
        notes: form.notes || undefined,
        favoriteThings: form.favoriteThings || undefined,
        giftIdeas: form.giftIdeas || undefined,
        interests: form.interests || undefined,
      };

      if (isEdit && person?.id) {
        const { data, error: e } = await api.PUT("/people/{id}", {
          params: { path: { id: person.id } },
          body,
        });
        if (e) throw new Error(apiError(e));
        toast({ title: "Saved", description: "Profile updated." });
        if (data && onSaved) onSaved(data as Person);
      } else {
        const { data, error: e } = await api.POST("/people", { body });
        if (e) throw new Error(apiError(e));
        toast({ title: "Created", description: "Person added to your vault." });
        if (data) {
          navigate(`/people/${data.id}`, { replace: true });
        }
      }
    } catch (err) {
      const msg = apiError(err);
      setError(msg);
      toast({ variant: "destructive", title: "Couldn't save", description: msg });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Basics */}
      <fieldset className="space-y-4">
        <legend className="font-serif text-lg font-semibold">Basics</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input
              required
              value={form.fullName}
              onChange={(e) => set("fullName", e.target.value)}
              disabled={saving}
            />
          </Field>
          <Field label="Nickname">
            <Input
              value={form.nickname}
              onChange={(e) => set("nickname", e.target.value)}
              disabled={saving}
            />
          </Field>
          <Field label="Relationship">
            <Input
              value={form.relationship}
              onChange={(e) => set("relationship", e.target.value)}
              placeholder="Friend, Partner, Sibling…"
              disabled={saving}
            />
          </Field>
          <Field label="Avatar URL">
            <Input
              type="url"
              value={form.avatarUrl}
              onChange={(e) => set("avatarUrl", e.target.value)}
              placeholder="https://…"
              disabled={saving}
            />
          </Field>
        </div>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2.5">
            <Switch
              checked={form.isFavorite ?? false}
              onCheckedChange={(v) => set("isFavorite", v)}
              disabled={saving}
            />
            <span className="flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 text-warning" /> Favorite
            </span>
          </label>
          <label className="flex items-center gap-2.5">
            <Switch
              checked={form.ageVisible ?? true}
              onCheckedChange={(v) => set("ageVisible", v)}
              disabled={saving}
            />
            <span className="text-sm">Show age</span>
          </label>
        </div>
      </fieldset>

      {/* Dates */}
      <fieldset className="space-y-4">
        <legend className="font-serif text-lg font-semibold">Important dates</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Birthday">
            <Input
              type="date"
              value={form.birthday ?? ""}
              onChange={(e) => set("birthday", e.target.value)}
              disabled={saving}
            />
          </Field>
          <Field label="Anniversary">
            <Input
              type="date"
              value={form.anniversary ?? ""}
              onChange={(e) => set("anniversary", e.target.value)}
              disabled={saving}
            />
          </Field>
          <Field label="Nameday country" className="sm:col-span-2">
            <CountrySelect
              value={form.namedayCountry ?? ""}
              onValueChange={(v) => {
                setForm((f) => ({
                  ...f,
                  namedayCountry: v,
                  // Clear month/day if country is cleared.
                  namedayMonth: v ? f.namedayMonth : undefined,
                  namedayDay: v ? f.namedayDay : undefined,
                }));
              }}
              allowNone
              placeholder="None"
              disabled={saving}
              aria-label="Nameday country"
            />
          </Field>
          <Field label="Nameday month">
            <Select
              value={form.namedayMonth ? String(form.namedayMonth) : "none"}
              onValueChange={(v) => set("namedayMonth", v === "none" ? undefined : Number(v))}
              disabled={saving || !form.namedayCountry}
            >
              <SelectTrigger>
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                {MONTH_NAMES.map((m, i) => (
                  <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Nameday day">
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={31}
                value={form.namedayDay ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  set("namedayDay", v === "" ? undefined : Math.max(1, Math.min(31, Number(v))));
                }}
                disabled={saving || !form.namedayCountry}
                placeholder="—"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setNamedaySearchOpen(true)}
                disabled={saving}
                aria-label="Search nameday"
              >
                <Search className="h-4 w-4" /> Search
              </Button>
            </div>
            {form.namedayMonth && form.namedayDay ? (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                {formatMonthDayFromParts(form.namedayMonth, form.namedayDay)}
              </p>
            ) : null}
          </Field>
        </div>
      </fieldset>

      <Dialog open={namedaySearchOpen} onOpenChange={setNamedaySearchOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Search nameday</DialogTitle>
            <DialogDescription>
              Find the nameday for a name across countries. Selecting a result fills
              the nameday country, month, and day.
            </DialogDescription>
          </DialogHeader>
          <NamedaySearch
            initialQuery={form.fullName.split(/\s+/)[0] ?? ""}
            country={form.namedayCountry || null}
            compact
            onSelect={(r) => {
              setForm((f) => ({
                ...f,
                namedayCountry: r.country.toUpperCase(),
                namedayMonth: r.month,
                namedayDay: r.day,
              }));
              toast({
                title: "Nameday selected",
                description: `${r.name} — ${formatMonthDayFromParts(r.month, r.day)} (${r.country.toUpperCase()})`,
              });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Contact */}
      <fieldset className="space-y-4">
        <legend className="font-serif text-lg font-semibold">Contact</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              disabled={saving}
            />
          </Field>
          <Field label="Phone">
            <Input
              type="tel"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              disabled={saving}
            />
          </Field>
          <Field label="Address" className="sm:col-span-2">
            <Input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              disabled={saving}
            />
          </Field>
        </div>
      </fieldset>

      {/* Tags */}
      <fieldset className="space-y-4">
        <legend className="font-serif text-lg font-semibold">Tags</legend>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => {
            const selected = (form.tagIds ?? []).includes(t.id ?? "");
            return (
              <button key={t.id} type="button" onClick={() => t.id && toggleTag(t.id)}>
                <Badge
                  variant={selected ? "default" : "outline"}
                  className={cn("cursor-pointer gap-1 transition-colors")}
                >
                  {t.name}
                  {selected ? <X className="h-3 w-3" /> : null}
                </Badge>
              </button>
            );
          })}
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags yet.</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void addTag();
              }
            }}
            placeholder="Create a new tag…"
            disabled={saving}
          />
          <Button type="button" variant="outline" onClick={() => void addTag()} disabled={saving || !newTag.trim()}>
            Add tag
          </Button>
        </div>
      </fieldset>

      {/* Notes & interests */}
      <fieldset className="space-y-4">
        <legend className="font-serif text-lg font-semibold">Notes & memories</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Notes" hint="Private, only visible to you.">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              disabled={saving}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-card/70 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
            />
          </Field>
          <Field label="Favorite things">
            <textarea
              value={form.favoriteThings}
              onChange={(e) => set("favoriteThings", e.target.value)}
              disabled={saving}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-card/70 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
            />
          </Field>
          <Field label="Gift ideas">
            <textarea
              value={form.giftIdeas}
              onChange={(e) => set("giftIdeas", e.target.value)}
              disabled={saving}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-card/70 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
            />
          </Field>
          <Field label="Interests">
            <textarea
              value={form.interests}
              onChange={(e) => set("interests", e.target.value)}
              disabled={saving}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-card/70 px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:opacity-50"
            />
          </Field>
        </div>
      </fieldset>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={saving}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add person"}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label>
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

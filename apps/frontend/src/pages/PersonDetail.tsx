import * as React from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Cake,
  Calendar,
  Edit2,
  Gift,
  Heart,
  Mail,
  MapPin,
  Phone,
  Plus,
  Sparkles,
  Star,
  Trash2,
} from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { PageHeader } from "@/components/common/PageHeader";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { TimelineList } from "@/components/timeline/TimelineList";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  ageYears,
  countdownLabel,
  daysUntilNext,
  daysUntilNextOccurrence,
  formatLongDate,
  formatMonthDayFromParts,
  relativeTime,
} from "@/lib/date";
import { TIMELINE_TYPES, countryFlag, countryName } from "@/lib/constants";

type Person = components["schemas"]["Person"];
type TimelineEntry = components["schemas"]["TimelineEntry"];
type TimelineEntryInput = components["schemas"]["TimelineEntryInput"];

export default function PersonDetail(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [person, setPerson] = React.useState<Person | null>(null);
  const [timeline, setTimeline] = React.useState<TimelineEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [addEntryOpen, setAddEntryOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const personRes = await api.GET("/people/{id}", { params: { path: { id } } });
      const personErr = personRes.error;
      if (personErr) throw new Error(apiError(personErr));
      setPerson((personRes.data as Person) ?? null);
      const timelineRes = await api.GET("/people/{id}/timeline", { params: { path: { id } } });
      const timelineErr = timelineRes.error;
      if (timelineErr) throw new Error(apiError(timelineErr));
      setTimeline((timelineRes.data as TimelineEntry[]) ?? []);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't load", description: apiError(err) });
      navigate("/people", { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate, toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const toggleFavorite = async (): Promise<void> => {
    if (!person?.id) return;
    try {
      const { data, error } = await api.POST("/people/{id}/favorite", {
        params: { path: { id: person.id } },
        body: { favorite: !person.isFavorite },
      });
      if (error) throw new Error(apiError(error));
      if (data) setPerson(data as Person);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't update", description: apiError(err) });
    }
  };

  const onDelete = async (): Promise<void> => {
    if (!person?.id) return;
    try {
      const { error } = await api.DELETE("/people/{id}", {
        params: { path: { id: person.id } },
      });
      if (error) throw new Error(apiError(error));
      toast({ title: "Deleted", description: `${person.fullName} removed from your vault.` });
      navigate("/people", { replace: true });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't delete", description: apiError(err) });
    }
  };

  const addTimelineEntry = async (entry: TimelineEntryInput): Promise<void> => {
    if (!id) return;
    try {
      const { data, error } = await api.POST("/people/{id}/timeline", {
        params: { path: { id } },
        body: entry,
      });
      if (error) throw new Error(apiError(error));
      if (data) setTimeline((t) => [...t, data as TimelineEntry]);
      setAddEntryOpen(false);
      toast({ title: "Memory added" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't add", description: apiError(err) });
    }
  };

  const deleteTimelineEntry = async (entryId: string): Promise<void> => {
    try {
      const { error } = await api.DELETE("/timeline/{id}", {
        params: { path: { id: entryId } },
      });
      if (error) throw new Error(apiError(error));
      setTimeline((t) => t.filter((e) => e.id !== entryId));
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't delete", description: apiError(err) });
    }
  };

  if (loading) {
    return <LoadingSpinner className="py-20" label="Loading profile" />;
  }

  if (!person) {
    return <></>;
  }

  const age = ageYears(person.birthday);
  const birthdayDays = daysUntilNextOccurrence(person.birthday);
  const namedayDays =
    person.namedayMonth && person.namedayDay
      ? daysUntilNext(person.namedayMonth, person.namedayDay)
      : null;

  return (
    <div className="space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/people">
            <ArrowLeft className="h-4 w-4" /> Back to people
          </Link>
        </Button>
        <PageHeader
          title={person.fullName ?? "Person"}
          description={person.nickname ? `"${person.nickname}"` : undefined}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => void toggleFavorite()} aria-label="Toggle favorite">
                <Star className={person.isFavorite ? "h-4 w-4 fill-warning text-warning" : "h-4 w-4"} />
              </Button>
              <Button asChild variant="outline">
                <Link to={`/people/${person.id}/edit`}>
                  <Edit2 className="h-4 w-4" /> Edit
                </Link>
              </Button>
              <Button variant="outline" size="icon" onClick={() => setConfirmOpen(true)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          }
        />
      </div>

      {/* Profile header card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-warm px-6 py-8 sm:px-8">
          <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
            <PersonAvatar
              name={person.fullName}
              avatarUrl={person.avatarUrl}
              nickname={person.nickname}
              size="xl"
              className="ring-4 ring-card/80"
            />
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-3xl font-semibold tracking-tight">
                {person.fullName}
              </h2>
              {person.relationship ? (
                <Badge variant="warm" className="mt-2">
                  {person.relationship}
                </Badge>
              ) : null}
              <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground sm:justify-start">
                {age !== null && person.ageVisible ? (
                  <span className="flex items-center gap-1.5">
                    <Cake className="h-4 w-4" /> {age} years old
                  </span>
                ) : null}
                {person.birthday ? (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> {formatLongDate(person.birthday)}
                  </span>
                ) : null}
                {birthdayDays !== null ? (
                  <Badge variant={birthdayDays === 0 ? "default" : "secondary"}>
                    {countdownLabel(birthdayDays)}
                  </Badge>
                ) : null}
                {person.namedayMonth && person.namedayDay ? (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4" />
                    {formatMonthDayFromParts(person.namedayMonth, person.namedayDay)}
                    {person.namedayCountry ? (
                      <span className="ml-0.5" aria-label={countryName(person.namedayCountry)}>
                        <span aria-hidden="true">{countryFlag(person.namedayCountry)}</span>
                      </span>
                    ) : null}
                  </span>
                ) : null}
                {namedayDays !== null ? (
                  <Badge variant={namedayDays === 0 ? "default" : "warm"}>
                    {countdownLabel(namedayDays)}
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Timeline */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Timeline</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setAddEntryOpen(true)}>
                <Plus className="h-4 w-4" /> Add memory
              </Button>
            </CardHeader>
            <CardContent>
              <TimelineList entries={timeline} onDelete={(tid) => void deleteTimelineEntry(tid)} />
            </CardContent>
          </Card>

          {/* Notes */}
          {person.notes ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" /> Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                  {person.notes}
                </p>
                <p className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  Private — only visible to you.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="space-y-6">
          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Contact</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ContactRow icon={Mail} label="Email" value={person.email} />
              <ContactRow icon={Phone} label="Phone" value={person.phone} />
              <ContactRow icon={MapPin} label="Address" value={person.address} />
              {!person.email && !person.phone && !person.address ? (
                <p className="text-sm text-muted-foreground">No contact info yet.</p>
              ) : null}
            </CardContent>
          </Card>

          {/* Tags */}
          {person.tags && person.tags.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Tags</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {person.tags.map((t) => (
                    <Badge key={t.id} variant="outline">{t.name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Gift ideas / favorites / interests */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" /> Favorites & gifts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <DetailBlock label="Favorite things" value={person.favoriteThings} icon={Star} />
              <DetailBlock label="Gift ideas" value={person.giftIdeas} icon={Gift} />
              <DetailBlock label="Interests" value={person.interests} icon={Heart} />
              {!person.favoriteThings && !person.giftIdeas && !person.interests ? (
                <p className="text-muted-foreground">Nothing recorded yet.</p>
              ) : null}
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            Added {relativeTime(person.createdAt)} · Updated {relativeTime(person.updatedAt)}
          </p>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Delete ${person.fullName}?`}
        description="This permanently removes their profile and all related data from your vault. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />

      <AddTimelineEntryDialog
        open={addEntryOpen}
        onOpenChange={setAddEntryOpen}
        personId={person.id ?? ""}
        onSubmit={(entry) => void addTimelineEntry(entry)}
      />
    </div>
  );
}

function ContactRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
}): React.ReactElement {
  if (!value) return <></>;
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-highlight">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="break-words text-sm">{value}</p>
      </div>
    </div>
  );
}

function DetailBlock({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string | null;
  icon: React.ComponentType<{ className?: string }>;
}): React.ReactElement {
  if (!value) return <></>;
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{value}</p>
    </div>
  );
}

function AddTimelineEntryDialog({
  open,
  onOpenChange,
  personId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  personId: string;
  onSubmit: (entry: TimelineEntryInput) => void;
}): React.ReactElement {
  const [type, setType] = React.useState<TimelineEntryInput["type"]>("memory");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [occurredOn, setOccurredOn] = React.useState("");

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSubmit({
      personId,
      type,
      title: title.trim() || undefined,
      body: body.trim() || undefined,
      occurredOn: occurredOn || undefined,
    });
    setTitle("");
    setBody("");
    setOccurredOn("");
    setType("memory");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a memory</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tl-type">Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as TimelineEntryInput["type"])}>
              <SelectTrigger id="tl-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMELINE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="tl-title">Title</Label>
            <Input id="tl-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tl-body">Details</Label>
            <textarea
              id="tl-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-card/70 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tl-date">Date</Label>
            <Input id="tl-date" type="date" value={occurredOn} onChange={(e) => setOccurredOn(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Add memory</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

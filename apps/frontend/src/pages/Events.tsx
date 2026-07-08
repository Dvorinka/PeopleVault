import * as React from "react";
import { Link } from "react-router-dom";
import {
  CalendarDays,
  Cake,
  Heart,
  GraduationCap,
  PartyPopper,
  Plus,
  Trash2,
  Edit2,
  Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { HolidayBrowser } from "@/components/holidays/HolidayBrowser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from "@/components/ui/switch";
import { api, apiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { EVENT_TYPES, EVENT_TYPE_LABEL } from "@/lib/constants";
import { formatLongDate, daysUntilNextOccurrence } from "@/lib/date";

type Event = components["schemas"]["Event"];
type EventInput = components["schemas"]["EventInput"];
type Person = components["schemas"]["Person"];

const TYPE_ICON: Record<string, LucideIcon> = {
  birthday: Cake,
  anniversary: Heart,
  wedding: Heart,
  graduation: GraduationCap,
  holiday: PartyPopper,
  nameday: CalendarDays,
  custom: CalendarDays,
};

export default function Events(): React.ReactElement {
  const { toast } = useToast();
  const { settings } = useAuth();
  const [events, setEvents] = React.useState<Event[]>([]);
  const [people, setPeople] = React.useState<Person[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filterPerson, setFilterPerson] = React.useState<string>("");
  const [daysAhead, setDaysAhead] = React.useState(30);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Event | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Event | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [importSelection, setImportSelection] = React.useState<
    components["schemas"]["Holiday"][]
  >([]);
  const [importing, setImporting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const evRes = await api.GET("/events", {
        params: {
          query: {
            personId: filterPerson || undefined,
            daysAhead,
          },
        },
      });
      const evErr = evRes.error;
      if (evErr) throw new Error(apiError(evErr));
      setEvents((evRes.data as Event[]) ?? []);
      const pplRes = await api.GET("/people", { params: { query: { pageSize: 100 } } });
      if (pplRes.data) setPeople((pplRes.data.items as Person[]) ?? []);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't load events", description: apiError(err) });
    } finally {
      setLoading(false);
    }
  }, [filterPerson, daysAhead, toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const personName = (id?: string | null): string => {
    if (!id) return "";
    return people.find((p) => p.id === id)?.fullName ?? "";
  };

  const onSave = async (input: EventInput): Promise<void> => {
    try {
      if (editing?.id) {
        const { data, error } = await api.PUT("/events/{id}", {
          params: { path: { id: editing.id } },
          body: input,
        });
        if (error) throw new Error(apiError(error));
        if (data) {
          setEvents((e) => e.map((x) => (x.id === editing.id ? (data as Event) : x)));
        }
        toast({ title: "Event updated" });
      } else {
        const { data, error } = await api.POST("/events", { body: input });
        if (error) throw new Error(apiError(error));
        if (data) setEvents((e) => [...e, data as Event]);
        toast({ title: "Event created" });
      }
      setDialogOpen(false);
      setEditing(null);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't save", description: apiError(err) });
    }
  };

  const onDelete = async (): Promise<void> => {
    if (!toDelete?.id) return;
    try {
      const { error } = await api.DELETE("/events/{id}", {
        params: { path: { id: toDelete.id } },
      });
      if (error) throw new Error(apiError(error));
      setEvents((e) => e.filter((x) => x.id !== toDelete.id));
      toast({ title: "Event deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't delete", description: apiError(err) });
    } finally {
      setConfirmOpen(false);
      setToDelete(null);
    }
  };

  const importHolidays = async (): Promise<void> => {
    if (importSelection.length === 0) return;
    setImporting(true);
    let created = 0;
    let failed = 0;
    try {
      for (const h of importSelection) {
        try {
          const { data, error } = await api.POST("/events", {
            body: {
              title: h.name ?? "",
              type: "holiday",
              eventDate: h.date ?? "",
              isRecurring: true,
              notes: h.holidayTypes && h.holidayTypes.length > 0
                ? h.holidayTypes.join(", ")
                : undefined,
            },
          });
          if (error) throw new Error(apiError(error));
          if (data) {
            setEvents((e) => [...e, data as Event]);
            created += 1;
          }
        } catch {
          failed += 1;
        }
      }
      if (created > 0) {
        toast({
          title: "Holidays imported",
          description: `${created} holiday event${created === 1 ? "" : "s"} added${
            failed > 0 ? `, ${failed} failed` : ""
          }.`,
        });
      } else if (failed > 0) {
        toast({
          variant: "destructive",
          title: "Import failed",
          description: `Couldn't import ${failed} holiday${failed === 1 ? "" : "s"}.`,
        });
      }
      setImportOpen(false);
      setImportSelection([]);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Events"
        description="Birthdays, anniversaries, and the moments worth remembering."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setImportSelection([]);
                setImportOpen(true);
              }}
            >
              <Download className="h-4 w-4" /> Import holidays
            </Button>
            <Button
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add event
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Person</Label>
          <Select value={filterPerson || "all"} onValueChange={(v) => setFilterPerson(v === "all" ? "" : v)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Everyone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Everyone</SelectItem>
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id ?? ""}>{p.fullName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Days ahead</Label>
          <Select value={String(daysAhead)} onValueChange={(v) => setDaysAhead(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[7, 30, 90, 180, 365].map((d) => (
                <SelectItem key={d} value={String(d)}>{d} days</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <LoadingSpinner className="py-20" label="Loading events" />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No events in this range"
          description="Add a birthday, anniversary, or special occasion to keep track of what's coming up."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add event
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((ev) => {
            const Icon = TYPE_ICON[ev.type ?? "custom"] ?? CalendarDays;
            const days = daysUntilNextOccurrence(ev.eventDate);
            return (
              <Card key={ev.id} className="group">
                <CardHeader className="flex-row items-start justify-between space-y-0">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-highlight">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{ev.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        {ev.type ? EVENT_TYPE_LABEL[ev.type] ?? ev.type : "Event"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setEditing(ev);
                        setDialogOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => {
                        setToDelete(ev);
                        setConfirmOpen(true);
                      }}
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm">{formatLongDate(ev.eventDate)}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {ev.isRecurring ? <Badge variant="outline">Recurring</Badge> : null}
                    {days !== null ? (
                      <Badge variant={days === 0 ? "default" : "secondary"}>
                        {days === 0 ? "Today!" : `in ${days} days`}
                      </Badge>
                    ) : null}
                    {ev.personId ? (
                      <Link to={`/people/${ev.personId}`} className="text-xs text-primary hover:underline">
                        {personName(ev.personId)}
                      </Link>
                    ) : null}
                  </div>
                  {ev.notes ? (
                    <p className="text-sm text-muted-foreground">{ev.notes}</p>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        event={editing}
        people={people}
        onSubmit={onSave}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete event?"
        description={toDelete ? `"${toDelete.title}" will be permanently removed.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={onDelete}
      />

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import holidays</DialogTitle>
            <DialogDescription>
              Browse public holidays and select the ones you want to add as recurring
              holiday events.
            </DialogDescription>
          </DialogHeader>
          <HolidayBrowser
            defaultCountry={settings?.namedayCountry ?? "CZ"}
            selectable
            onSelectionChange={setImportSelection}
          />
          <DialogFooter className="sticky bottom-0 bg-card pt-2">
            <Button variant="outline" onClick={() => setImportOpen(false)} disabled={importing}>
              Cancel
            </Button>
            <Button
              onClick={() => void importHolidays()}
              disabled={importing || importSelection.length === 0}
            >
              {importing
                ? "Importing…"
                : `Import selected${importSelection.length > 0 ? ` (${importSelection.length})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventDialog({
  open,
  onOpenChange,
  event,
  people,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  event: Event | null;
  people: Person[];
  onSubmit: (input: EventInput) => void;
}): React.ReactElement {
  const [title, setTitle] = React.useState("");
  const [type, setType] = React.useState<EventInput["type"]>("birthday");
  const [eventDate, setEventDate] = React.useState("");
  const [personId, setPersonId] = React.useState("");
  const [isRecurring, setIsRecurring] = React.useState(true);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setTitle(event?.title ?? "");
      setType((event?.type as EventInput["type"]) ?? "birthday");
      setEventDate(event?.eventDate ?? "");
      setPersonId(event?.personId ?? "");
      setIsRecurring(event?.isRecurring ?? true);
      setNotes(event?.notes ?? "");
    }
  }, [open, event]);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    onSubmit({
      title: title.trim(),
      type,
      eventDate,
      personId: personId || undefined,
      isRecurring,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "Add event"}</DialogTitle>
          <DialogDescription>Mark a special occasion.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ev-title">Title</Label>
            <Input id="ev-title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ev-type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as EventInput["type"])}>
                <SelectTrigger id="ev-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ev-date">Date</Label>
              <Input id="ev-date" type="date" required value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ev-person">Person (optional)</Label>
            <Select value={personId || "none"} onValueChange={(v) => setPersonId(v === "none" ? "" : v)}>
              <SelectTrigger id="ev-person"><SelectValue placeholder="No one" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No one</SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id ?? ""}>{p.fullName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2.5">
            <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
            <span className="text-sm">Recurring yearly</span>
          </label>
          <div className="space-y-2">
            <Label htmlFor="ev-notes">Notes</Label>
            <Input id="ev-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{event ? "Save" : "Add event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

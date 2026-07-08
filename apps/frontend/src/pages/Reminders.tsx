import * as React from "react";
import { Bell, BellRing, Check, Plus } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { LEAD_DAY_OPTIONS } from "@/lib/constants";
import { relativeTime } from "@/lib/date";

type Reminder = components["schemas"]["Reminder"];
type Event = components["schemas"]["Event"];
type ReminderInput = components["schemas"]["ReminderInput"];

export default function Reminders(): React.ReactElement {
  const { toast } = useToast();
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [events, setEvents] = React.useState<Event[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const rRes = await api.GET("/reminders");
      const rErr = rRes.error;
      if (rErr) throw new Error(apiError(rErr));
      setReminders((rRes.data as Reminder[]) ?? []);
      const eRes = await api.GET("/events", { params: { query: { daysAhead: 365 } } });
      if (eRes.data) setEvents(eRes.data as Event[]);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't load reminders", description: apiError(err) });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const eventTitle = (id?: string): string => {
    if (!id) return "";
    return events.find((e) => e.id === id)?.title ?? "Unknown event";
  };

  const onFire = async (id: string): Promise<void> => {
    try {
      const { error } = await api.POST("/reminders/{id}/fire", {
        params: { path: { id } },
      });
      if (error) throw new Error(apiError(error));
      setReminders((r) => r.filter((x) => x.id !== id));
      toast({ title: "Reminder dismissed" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't dismiss", description: apiError(err) });
    }
  };

  const onCreate = async (input: ReminderInput): Promise<void> => {
    try {
      const { data, error } = await api.POST("/reminders", { body: input });
      if (error) throw new Error(apiError(error));
      if (data) setReminders((r) => [...r, data as Reminder]);
      setDialogOpen(false);
      toast({ title: "Reminder created" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't create", description: apiError(err) });
    }
  };

  const pending = reminders.filter((r) => !r.firedAt);
  const fired = reminders.filter((r) => r.firedAt);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Reminders"
        description="Never miss the moments that matter."
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4" /> Add reminder
          </Button>
        }
      />

      {loading ? (
        <LoadingSpinner className="py-20" label="Loading reminders" />
      ) : reminders.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No reminders yet"
          description="Create a reminder to get a heads-up before a birthday or event."
          action={
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Add reminder
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
              <BellRing className="h-5 w-5 text-primary" /> Pending ({pending.length})
            </h2>
            {pending.length === 0 ? (
              <p className="rounded-lg bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
                You're all caught up.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {pending.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15">
                        <Bell className="h-5 w-5 text-warning" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{eventTitle(r.eventId)}</p>
                        <p className="text-xs text-muted-foreground">
                          {r.leadDays === 0 ? "Day-of" : `${r.leadDays} days before`} ·{" "}
                          {relativeTime(r.createdAt)}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => r.id && void onFire(r.id)}>
                        <Check className="h-4 w-4" /> Done
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {fired.length > 0 ? (
            <section className="space-y-3">
              <h2 className="font-serif text-lg font-semibold text-muted-foreground">
                Fired ({fired.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {fired.map((r) => (
                  <Card key={r.id} className="opacity-70">
                    <CardContent className="flex items-center gap-3 p-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                        <Check className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{eventTitle(r.eventId)}</p>
                        <p className="text-xs text-muted-foreground">
                          Fired {relativeTime(r.firedAt)}
                        </p>
                      </div>
                      <Badge variant="outline">Done</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      )}

      <ReminderDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        events={events}
        onSubmit={onCreate}
      />
    </div>
  );
}

function ReminderDialog({
  open,
  onOpenChange,
  events,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  events: Event[];
  onSubmit: (input: ReminderInput) => void;
}): React.ReactElement {
  const [eventId, setEventId] = React.useState("");
  const [leadDays, setLeadDays] = React.useState(7);

  React.useEffect(() => {
    if (open) {
      setEventId(events[0]?.id ?? "");
      setLeadDays(7);
    }
  }, [open, events]);

  const submit = (e: React.FormEvent): void => {
    e.preventDefault();
    if (!eventId) return;
    onSubmit({ eventId, leadDays });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add reminder</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="r-event">Event</Label>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger id="r-event"><SelectValue placeholder="Choose an event" /></SelectTrigger>
              <SelectContent>
                {events.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id ?? ""}>{ev.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="r-lead">Remind me</Label>
            <Select value={String(leadDays)} onValueChange={(v) => setLeadDays(Number(v))}>
              <SelectTrigger id="r-lead"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAD_DAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!eventId}>Create reminder</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

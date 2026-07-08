import * as React from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  Cake,
  Heart,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { BirthdayCard } from "@/components/dashboard/BirthdayCard";
import { AnniversaryCard } from "@/components/dashboard/AnniversaryCard";
import { NamedayCard } from "@/components/dashboard/NamedayCard";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { PersonAvatar } from "@/components/common/PersonAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { EVENT_TYPE_LABEL } from "@/lib/constants";
import { formatMonthDay, relativeTime } from "@/lib/date";

type Dashboard = components["schemas"]["Dashboard"];

interface SectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
  emptyMessage: string;
}

function Section({
  title,
  icon: Icon,
  children,
  action,
  emptyMessage,
}: SectionProps): React.ReactElement {
  const count = React.Children.count(children);
  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-lg font-semibold">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h2>
        {action}
      </div>
      {count === 0 ? (
        <p className="rounded-lg bg-muted/40 px-4 py-6 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-2.5">{children}</div>
      )}
    </section>
  );
}

export default function Dashboard(): React.ReactElement {
  const { user } = useAuth();
  const { toast } = useToast();
  const [data, setData] = React.useState<Dashboard | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data: d, error } = await api.GET("/dashboard");
        if (error) throw new Error(apiError(error));
        if (active) setData(d ?? null);
      } catch (err) {
        toast({ variant: "destructive", title: "Couldn't load dashboard", description: apiError(err) });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [toast]);

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={`Welcome${user?.name ? `, ${user.name}` : ""}`}
          description="Here's what's happening in your vault."
        />
        <LoadingSpinner className="py-20" label="Loading dashboard" />
      </div>
    );
  }

  const stats = data?.stats;
  const upcomingBirthdays = data?.upcomingBirthdays ?? [];
  const upcomingAnniversaries = data?.upcomingAnniversaries ?? [];
  const todaysNamedays = data?.todaysNamedays ?? [];
  const todaysEvents = data?.todaysEvents ?? [];
  const recentlyAdded = data?.recentlyAdded ?? [];
  const pendingReminders = data?.pendingReminders ?? [];

  const hasPeople = stats?.totalPeople !== undefined && stats.totalPeople > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name}` : ""}`}
        description="Here's what's happening in your vault."
        actions={
          <Button asChild variant="outline">
            <Link to="/people/new">Add person</Link>
          </Button>
        }
      />

      {!hasPeople ? (
        <EmptyState
          icon={Users}
          title="Your vault is empty"
          description="Add the first person to your vault — a family member, a friend, anyone you want to remember and celebrate."
          action={
            <Button asChild>
              <Link to="/people/new">Add your first person</Link>
            </Button>
          }
        />
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatsCard icon={Users} label="Total people" value={stats?.totalPeople ?? 0} />
        <StatsCard icon={Star} label="Favorites" value={stats?.favorites ?? 0} accent="warm" />
        <StatsCard
          icon={Cake}
          label="Upcoming this month"
          value={stats?.upcomingThisMonth ?? 0}
          accent="success"
        />
        <StatsCard
          icon={Bell}
          label="Pending reminders"
          value={pendingReminders.length}
          accent="primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Section
            title="Upcoming birthdays"
            icon={Cake}
            emptyMessage="No birthdays coming up soon."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/people">View all</Link>
              </Button>
            }
          >
            {upcomingBirthdays.slice(0, 5).map((p) => (
              <BirthdayCard key={p.id} person={p} />
            ))}
          </Section>

          <Section
            title="Upcoming anniversaries"
            icon={Heart}
            emptyMessage="No anniversaries coming up soon."
          >
            {upcomingAnniversaries.slice(0, 5).map((p) => (
              <AnniversaryCard key={p.id} person={p} />
            ))}
          </Section>

          <Section
            title="Today's events"
            icon={CalendarDays}
            emptyMessage="Nothing scheduled for today."
          >
            {todaysEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-gradient-card p-4 shadow-soft"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-highlight">
                  <CalendarDays className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{ev.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {ev.type ? EVENT_TYPE_LABEL[ev.type] ?? ev.type : "Event"}
                    {ev.eventDate ? ` · ${formatMonthDay(ev.eventDate)}` : ""}
                  </p>
                </div>
                {ev.isRecurring ? (
                  <Badge variant="outline" className="text-[10px]">Recurring</Badge>
                ) : null}
              </div>
            ))}
          </Section>
        </div>

        <div className="space-y-6">
          <Section
            title="Namedays today"
            icon={Sparkles}
            emptyMessage="No namedays today."
          >
            {todaysNamedays.length > 0 ? (
              <div className="space-y-2.5">
                {todaysNamedays.map((nd, i) => (
                  <NamedayCard key={i} nameday={nd} />
                ))}
              </div>
            ) : null}
          </Section>

          <Section
            title="Recently added"
            icon={Users}
            emptyMessage="No people yet."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/people">View all</Link>
              </Button>
            }
          >
            {recentlyAdded.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to={`/people/${p.id}`}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-gradient-card p-3 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-lift"
              >
                <PersonAvatar
                  name={p.fullName}
                  avatarUrl={p.avatarUrl}
                  nickname={p.nickname}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.fullName}</p>
                  <p className="text-xs text-muted-foreground">
                    {relativeTime(p.createdAt)}
                  </p>
                </div>
              </Link>
            ))}
          </Section>

          <Section
            title="Pending reminders"
            icon={Bell}
            emptyMessage="You're all caught up."
            action={
              <Button asChild variant="ghost" size="sm">
                <Link to="/reminders">Manage</Link>
              </Button>
            }
          >
            {pendingReminders.slice(0, 4).map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-border/70 bg-gradient-card p-3 shadow-soft"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15">
                  <Bell className="h-4 w-4 text-warning" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.leadDays === 0 ? "Day-of" : `${r.leadDays}d ahead`} reminder
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {relativeTime(r.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </Section>

          <div>
            <h2 className="mb-3 font-serif text-lg font-semibold">Quick actions</h2>
            <QuickActions />
          </div>
        </div>
      </div>
    </div>
  );
}

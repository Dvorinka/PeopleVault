import * as React from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  CalendarDays,
  Heart,
  Home,
  Settings,
  Tag,
  Users,
  Bell,
  Sparkles,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/people", label: "People", icon: Users },
  { to: "/events", label: "Events", icon: CalendarDays },
  { to: "/reminders", label: "Reminders", icon: Bell },
  { to: "/holidays", label: "Holidays", icon: CalendarDays },
  { to: "/tags", label: "Tags", icon: Tag },
  { to: "/settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Sidebar({ open, onOpenChange }: SidebarProps): React.ReactElement {
  const location = useLocation();
  const { user } = useAuth();

  React.useEffect(() => {
    onOpenChange(false);
  }, [location.pathname, onOpenChange]);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Primary navigation"
      >
        <div className="flex h-16 items-center justify-between px-5">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
              <Heart className="h-5 w-5" />
            </span>
            <span className="font-serif text-xl font-semibold tracking-tight">
              PeopleVault
            </span>
          </Link>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground hover:bg-sidebar-accent lg:hidden"
            onClick={() => onOpenChange(false)}
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-card text-foreground shadow-soft"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 shrink-0 transition-transform group-hover:scale-110",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-xl bg-gradient-warm p-4 shadow-soft">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Your vault
            </span>
            </div>
            <p className="mt-2 font-serif text-sm leading-relaxed text-muted-foreground">
              {user?.name
                ? `Welcome back, ${user.name}.`
                : "Keep the people you love close."}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

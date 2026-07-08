import * as React from "react";
import { Link } from "react-router-dom";
import { CalendarPlus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function QuickActions(): React.ReactElement {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Button asChild variant="warm" size="lg" className="justify-start">
        <Link to="/people/new">
          <UserPlus className="h-5 w-5" />
          <span className="flex flex-col items-start">
            <span className="text-sm font-semibold">Add a person</span>
            <span className="text-xs font-normal text-muted-foreground">
              Start a new profile
            </span>
          </span>
        </Link>
      </Button>
      <Button asChild variant="warm" size="lg" className="justify-start">
        <Link to="/events">
          <CalendarPlus className="h-5 w-5" />
          <span className="flex flex-col items-start">
            <span className="text-sm font-semibold">Add an event</span>
            <span className="text-xs font-normal text-muted-foreground">
              Birthday, anniversary, more
            </span>
          </span>
        </Link>
      </Button>
    </div>
  );
}

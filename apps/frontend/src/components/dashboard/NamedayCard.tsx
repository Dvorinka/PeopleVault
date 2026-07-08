import * as React from "react";
import { Sparkles } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { Badge } from "@/components/ui/badge";

type Nameday = components["schemas"]["Nameday"];

export function NamedayCard({ nameday }: { nameday: Nameday }): React.ReactElement {
  const names = nameday.names ?? [];
  return (
    <div className="rounded-xl border border-border/70 bg-gradient-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wide">
          Nameday today
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {names.length > 0 ? (
          names.map((n) => (
            <Badge key={n} variant="warm" className="font-serif text-sm">
              {n}
            </Badge>
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No nameday today</span>
        )}
      </div>
    </div>
  );
}

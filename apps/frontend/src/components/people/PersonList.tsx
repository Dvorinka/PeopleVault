import * as React from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Star, Users } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { PersonCard } from "@/components/people/PersonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Person = components["schemas"]["Person"];
type Tag = components["schemas"]["Tag"];

const PAGE_SIZE = 24;

export function PersonList(): React.ReactElement {
  const [params, setParams] = useSearchParams();
  const { toast } = useToast();

  const q = params.get("q") ?? "";
  const tag = params.get("tag") ?? "";
  const relationship = params.get("relationship") ?? "";
  const favorite = params.get("favorite") === "1";
  const page = Math.max(1, Number(params.get("page") ?? "1"));

  const [people, setPeople] = React.useState<Person[]>([]);
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [searchInput, setSearchInput] = React.useState(q);

  // Debounce search input -> URL param
  React.useEffect(() => {
    const t = setTimeout(() => {
      if (searchInput !== q) {
        const next = new URLSearchParams(params);
        if (searchInput) next.set("q", searchInput);
        else next.delete("q");
        next.delete("page");
        setParams(next, { replace: true });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await api.GET("/people", {
          params: {
            query: {
              q: q || undefined,
              tag: tag || undefined,
              relationship: relationship || undefined,
              favorite: favorite ? true : undefined,
              page,
              pageSize: PAGE_SIZE,
            },
          },
        });
        if (error) throw new Error(apiError(error));
        if (active) {
          setPeople((data?.items as Person[]) ?? []);
          setTotal(data?.total ?? 0);
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Couldn't load people", description: apiError(err) });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [q, tag, relationship, favorite, page, toast]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await api.GET("/tags");
        if (error) throw new Error(apiError(error));
        if (active) setTags((data as Tag[]) ?? []);
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const relationships = React.useMemo(() => {
    const set = new Set<string>();
    people.forEach((p) => {
      if (p.relationship) set.add(p.relationship);
    });
    return Array.from(set).sort();
  }, [people]);

  const updateParam = (key: string, value: string | null): void => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    setParams(next, { replace: true });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by name, nickname, tag…"
            className="pl-9"
            aria-label="Search people"
          />
        </div>
        <Button
          variant={favorite ? "default" : "outline"}
          onClick={() => updateParam("favorite", favorite ? null : "1")}
        >
          <Star className={favorite ? "h-4 w-4 fill-current" : "h-4 w-4"} />
          Favorites
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Filter:</span>
        {tags.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => updateParam("tag", tag === t.name ? null : t.name ?? null)}
          >
            <Badge
              variant={tag === t.name ? "default" : "outline"}
              className="cursor-pointer transition-colors"
            >
              {t.name}
            </Badge>
          </button>
        ))}
        {relationships.length > 0 ? (
          <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
        ) : null}
        {relationships.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => updateParam("relationship", relationship === r ? null : r)}
          >
            <Badge
              variant={relationship === r ? "default" : "warm"}
              className="cursor-pointer transition-colors"
            >
              {r}
            </Badge>
          </button>
        ))}
        {(q || tag || relationship || favorite) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setParams(new URLSearchParams(), { replace: true });
            }}
          >
            Clear all
          </Button>
        )}
      </div>

      {loading ? (
        <LoadingSpinner className="py-20" label="Loading people" />
      ) : people.length === 0 ? (
        <EmptyState
          icon={Users}
          title={q || tag || relationship || favorite ? "No matches found" : "No people yet"}
          description={
            q || tag || relationship || favorite
              ? "Try a different search or clear your filters."
              : "Add the first person to your vault to get started."
          }
          action={
            !q && !tag && !relationship && !favorite ? (
              <Button asChild>
                <a href="/people/new">Add a person</a>
              </Button>
            ) : null
          }
        />
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "person" : "people"}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {people.map((p, i) => (
              <PersonCard key={p.id} person={p} index={i} />
            ))}
          </div>

          {totalPages > 1 ? (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => updateParam("page", String(page - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => updateParam("page", String(page + 1))}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

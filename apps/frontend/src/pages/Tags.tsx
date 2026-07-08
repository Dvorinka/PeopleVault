import * as React from "react";
import { Link } from "react-router-dom";
import { Plus, Tag as TagIcon, Trash2 } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Tag = components["schemas"]["Tag"];

export default function Tags(): React.ReactElement {
  const { toast } = useToast();
  const [tags, setTags] = React.useState<Tag[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [newName, setNewName] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Tag | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await api.GET("/tags");
      if (error) throw new Error(apiError(error));
      setTags((data as Tag[]) ?? []);
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't load tags", description: apiError(err) });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const { data, error } = await api.POST("/tags", { body: { name } });
      if (error) throw new Error(apiError(error));
      if (data) setTags((t) => [...t, data as Tag]);
      setNewName("");
      toast({ title: "Tag created" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't create tag", description: apiError(err) });
    } finally {
      setCreating(false);
    }
  };

  const remove = async (): Promise<void> => {
    if (!toDelete?.id) return;
    try {
      const { error } = await api.DELETE("/tags/{id}", {
        params: { path: { id: toDelete.id } },
      });
      if (error) throw new Error(apiError(error));
      setTags((t) => t.filter((x) => x.id !== toDelete.id));
      toast({ title: "Tag deleted" });
    } catch (err) {
      toast({ variant: "destructive", title: "Couldn't delete", description: apiError(err) });
    } finally {
      setToDelete(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tags"
        description="Organize your people with labels that make sense to you."
      />

      <Card>
        <CardContent className="p-4">
          <form onSubmit={create} className="flex gap-2">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New tag name…"
              disabled={creating}
              maxLength={40}
            />
            <Button type="submit" disabled={creating || !newName.trim()}>
              <Plus className="h-4 w-4" /> Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {loading ? (
        <LoadingSpinner className="py-20" label="Loading tags" />
      ) : tags.length === 0 ? (
        <EmptyState
          icon={TagIcon}
          title="No tags yet"
          description="Tags help you group people — by family, school, work, or anything you like."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((t) => (
            <Card key={t.id} className="group">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-highlight">
                    <TagIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{t.name}</p>
                    <Link
                      to={`/people?tag=${encodeURIComponent(t.name ?? "")}`}
                      className="text-xs text-primary hover:underline"
                    >
                      View people
                    </Link>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => setToDelete(t)}
                  aria-label={`Delete ${t.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete tag?"
        description={toDelete ? `"${toDelete.name}" will be removed from all people.` : ""}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}

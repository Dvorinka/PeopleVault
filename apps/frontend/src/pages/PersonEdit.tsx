import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import type { components } from "@peoplevault/api-client";

import { PageHeader } from "@/components/common/PageHeader";
import { PersonForm } from "@/components/people/PersonForm";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { api, apiError } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Person = components["schemas"]["Person"];

export default function PersonEdit(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isNew = !id;
  const [person, setPerson] = React.useState<Person | null>(null);
  const [loading, setLoading] = React.useState(!isNew);

  React.useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      try {
        const { data, error } = await api.GET("/people/{id}", {
          params: { path: { id } },
        });
        if (error) throw new Error(apiError(error));
        if (active) setPerson((data as Person) ?? null);
      } catch (err) {
        toast({ variant: "destructive", title: "Couldn't load", description: apiError(err) });
        navigate("/people", { replace: true });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [id, navigate, toast]);

  if (loading) {
    return <LoadingSpinner className="py-20" label="Loading profile" />;
  }

  return (
    <div className="space-y-8">
      <div>
        <Button variant="ghost" size="sm" className="mb-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <PageHeader
          title={isNew ? "Add a person" : `Edit ${person?.fullName ?? "person"}`}
          description={
            isNew
              ? "Start a new profile in your vault."
              : "Update their details and memories."
          }
        />
      </div>
      <div className="mx-auto max-w-3xl rounded-2xl border border-border/70 bg-card p-6 shadow-soft sm:p-8">
        <PersonForm
          person={person ?? undefined}
          onSaved={(p) => navigate(`/people/${p.id}`, { replace: true })}
        />
      </div>
    </div>
  );
}

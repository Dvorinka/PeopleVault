import * as React from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/common/PageHeader";
import { PersonList } from "@/components/people/PersonList";
import { Button } from "@/components/ui/button";

export default function People(): React.ReactElement {
  return (
    <div className="space-y-8">
      <PageHeader
        title="People"
        description="Everyone in your vault — search, filter, and celebrate."
        actions={
          <Button asChild>
            <Link to="/people/new">
              <Plus className="h-4 w-4" /> Add person
            </Link>
          </Button>
        }
      />
      <PersonList />
    </div>
  );
}

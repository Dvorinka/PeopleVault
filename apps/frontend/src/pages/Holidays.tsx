import * as React from "react";

import { PageHeader } from "@/components/common/PageHeader";
import { HolidayBrowser } from "@/components/holidays/HolidayBrowser";
import { useAuth } from "@/lib/auth";

export default function Holidays(): React.ReactElement {
  const { settings } = useAuth();
  const defaultCountry = settings?.namedayCountry ?? "CZ";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Holidays"
        description="Browse public holidays by country and year."
      />
      <HolidayBrowser defaultCountry={defaultCountry} />
    </div>
  );
}

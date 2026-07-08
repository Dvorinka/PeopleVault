import { Link } from "react-router-dom";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound(): React.ReactElement {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-hero px-6 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-highlight shadow-soft">
        <Compass className="h-8 w-8 text-primary" />
      </div>
      <p className="font-serif text-6xl font-semibold tracking-tight text-primary">404</p>
      <h1 className="mt-2 font-serif text-2xl font-semibold">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you're looking for has wandered off. Let's get you back to familiar
        ground.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Back to dashboard</Link>
      </Button>
    </div>
  );
}

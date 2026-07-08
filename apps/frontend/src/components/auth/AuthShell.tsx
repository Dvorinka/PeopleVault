import * as React from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { motion } from "framer-motion";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface AuthShellProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Centered card on a warm gradient backdrop for auth pages.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: AuthShellProps): React.ReactElement {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-hero px-4 py-10">
      {/* Decorative blurred blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-highlight-strong/40 blur-3xl"
      />

      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <Link
          to="/"
          className="mb-6 flex items-center justify-center gap-2.5 text-foreground"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft">
            <Heart className="h-5 w-5" />
          </span>
          <span className="font-serif text-2xl font-semibold tracking-tight">
            PeopleVault
          </span>
        </Link>

        <div className="rounded-2xl border border-border/70 bg-card/90 p-8 shadow-lift backdrop-blur-sm">
          <div className="mb-6 space-y-1.5 text-center">
            <h1 className="font-serif text-2xl font-semibold tracking-tight">
              {title}
            </h1>
            {description ? (
              <p className="text-sm text-muted-foreground text-pretty">
                {description}
              </p>
            ) : null}
          </div>
          {children}
        </div>

        {footer ? (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {footer}
          </p>
        ) : null}
      </motion.div>
    </div>
  );
}

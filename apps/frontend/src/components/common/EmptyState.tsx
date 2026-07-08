import * as React from "react";
import { motion, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: prefersReducedMotion ? 0 : 0.06 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: prefersReducedMotion ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] },
  },
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps): React.ReactElement {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-gradient-card px-6 py-16 text-center",
        className
      )}
    >
      <motion.div
        variants={itemVariants}
        className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-highlight/80 shadow-soft"
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-warm opacity-60" />
        <Icon className="relative h-9 w-9 text-primary" aria-hidden="true" />
      </motion.div>
      <motion.h3
        variants={itemVariants}
        className="font-serif text-2xl font-semibold tracking-tight"
      >
        {title}
      </motion.h3>
      {description ? (
        <motion.p
          variants={itemVariants}
          className="mt-2 max-w-sm text-sm text-muted-foreground text-pretty"
        >
          {description}
        </motion.p>
      ) : null}
      {action ? (
        <motion.div variants={itemVariants} className="mt-6">
          {action}
        </motion.div>
      ) : null}
    </motion.div>
  );
}

import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarGradient, initials } from "@/lib/date";
import { cn } from "@/lib/utils";

interface PersonAvatarProps {
  name: string | null | undefined;
  avatarUrl?: string | null;
  nickname?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<PersonAvatarProps["size"]>, string> = {
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-lg",
  xl: "h-24 w-24 text-2xl",
};

export function PersonAvatar({
  name,
  avatarUrl,
  nickname,
  size = "md",
  className,
}: PersonAvatarProps): React.ReactElement {
  const display = nickname || name || "?";
  return (
    <Avatar className={cn(SIZE_CLASSES[size], className)}>
      {avatarUrl ? (
        <AvatarImage src={avatarUrl} alt={display ?? "Avatar"} />
      ) : null}
      <AvatarFallback
        className={cn(
          "bg-gradient-to-br text-white",
          avatarGradient(name ?? nickname ?? display)
        )}
      >
        {initials(display)}
      </AvatarFallback>
    </Avatar>
  );
}

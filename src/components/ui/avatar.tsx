import React from "react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  initials?: string;
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  color?: "blue" | "indigo" | "emerald" | "amber" | "rose" | "slate";
  border?: boolean;
}

const sizeClass = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-2xl",
};

const colorClass = {
  blue: "bg-blue-600",
  indigo: "bg-indigo-600",
  emerald: "bg-emerald-600",
  amber: "bg-amber-600",
  rose: "bg-rose-600",
  slate: "bg-slate-600",
};

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  src,
  alt,
  size = "md",
  color = "blue",
  border = false,
}) => {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={cn(
          "rounded-full object-cover",
          sizeClass[size],
          border && "border-2 border-white"
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center text-white font-bold",
        sizeClass[size],
        colorClass[color],
        border && "border-2 border-white"
      )}
    >
      {initials}
    </div>
  );
};

interface AvatarWithStatusProps extends AvatarProps {
  status?: "online" | "offline" | "away" | "busy";
}

export const AvatarWithStatus: React.FC<AvatarWithStatusProps> = ({
  status = "online",
  size = "md",
  ...props
}) => {
  const statusColor = {
    online: "bg-emerald-500",
    offline: "bg-slate-400",
    away: "bg-amber-500",
    busy: "bg-rose-500",
  }[status];

  const statusSize = {
    xs: "w-1.5 h-1.5",
    sm: "w-2 h-2",
    md: "w-2.5 h-2.5",
    lg: "w-3 h-3",
    xl: "w-4 h-4",
  }[size];

  return (
    <div className="relative inline-block">
      <Avatar size={size} {...props} />
      <div
        className={cn(
          "absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-[#13161f]",
          statusColor,
          statusSize
        )}
      />
    </div>
  );
};

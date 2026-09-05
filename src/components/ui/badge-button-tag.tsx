import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral";

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: "sm" | "md" | "lg";
}

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30",
  warning: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30",
  error: "bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30",
  info: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30",
  neutral: "bg-slate-100 text-slate-600 border border-slate-300 dark:bg-slate-700/40 dark:text-slate-300 dark:border-slate-600/40",
};

export const Badge: React.FC<BadgeProps> = ({ label, variant = "neutral", size = "sm" }) => {
  const sizeClass = {
    sm: "px-2 py-1 text-xs",
    md: "px-2.5 py-1.5 text-xs",
    lg: "px-3 py-2 text-sm",
  }[size];

  return (
    <span className={cn("font-semibold rounded-lg inline-flex items-center whitespace-nowrap", sizeClass, variantStyles[variant])}>
      {label}
    </span>
  );
};

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "success" | "danger";

interface ButtonProps {
  label: string;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
  /** Plays a left-to-right fill wipe (icon riding its trailing edge) instead of
   * the plain label — for a "confirm and advance" moment like sending or paying. */
  isAnimating?: boolean;
}

const buttonVariantStyles: Record<ButtonVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800",
  secondary: "bg-slate-200 text-slate-900 hover:bg-slate-300 active:bg-slate-400 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600 dark:active:bg-slate-800",
  ghost: "text-slate-600 hover:bg-slate-100 active:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700/50 dark:active:bg-slate-600",
  outline: "border border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700/30 dark:active:bg-slate-700",
  success: "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800",
  danger: "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800",
};

const wipeFillStyles: Record<ButtonVariant, string> = {
  primary: "bg-blue-500",
  secondary: "bg-slate-400/60 dark:bg-slate-500/60",
  ghost: "bg-slate-300/50 dark:bg-slate-500/40",
  outline: "bg-slate-200 dark:bg-slate-600/50",
  success: "bg-emerald-500",
  danger: "bg-rose-500",
};

export const StyledButton: React.FC<ButtonProps> = ({
  label,
  variant = "primary",
  size = "md",
  icon,
  onClick,
  disabled = false,
  fullWidth = false,
  isAnimating = false,
}) => {
  const sizeClass = {
    sm: "px-2.5 py-1.5 text-xs gap-1.5",
    md: "px-3 py-2 text-sm gap-2",
    lg: "px-4 py-2.5 text-base gap-2",
  }[size];

  const [filled, setFilled] = useState(false);
  useEffect(() => {
    if (!isAnimating) {
      setFilled(false);
      return;
    }
    const raf = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(raf);
  }, [isAnimating]);

  return (
    <button
      onClick={onClick}
      disabled={disabled || isAnimating}
      className={cn(
        "group relative overflow-hidden font-semibold rounded-xl transition-colors flex items-center justify-center",
        sizeClass,
        fullWidth && "w-full",
        disabled && "opacity-50 cursor-not-allowed",
        buttonVariantStyles[variant]
      )}
    >
      {isAnimating ? (
        <>
          <span className="invisible inline-flex items-center gap-2">
            {icon}
            {label}
          </span>
          <span className="absolute inset-0 inline-flex items-center justify-center gap-2">
            {icon}
            {label}
          </span>
          <span
            className={cn("absolute inset-y-0 left-0 rounded-r-xl transition-[width] duration-500 ease-out", wipeFillStyles[variant])}
            style={{ width: filled ? "100%" : "0%" }}
          >
            <span className="absolute inset-y-0 right-0 flex items-center pr-3">{icon}</span>
          </span>
        </>
      ) : (
        <>
          {icon && <span className="flex items-center transition-transform duration-200 group-hover:translate-x-1">{icon}</span>}
          {label}
        </>
      )}
    </button>
  );
};

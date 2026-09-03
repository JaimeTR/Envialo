import React, { ReactNode } from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface BentoKpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "default" | "active" | "inactive" | "deleted" | "blue";
}

export const BentoKpiCard: React.FC<BentoKpiCardProps> = ({ title, value, icon: Icon, variant = "default" }) => {
  const style = {
    active: {
      pill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/60",
      watermark: "text-emerald-100 dark:text-emerald-950/40",
    },
    inactive: {
      pill: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800/60",
      watermark: "text-amber-100 dark:text-amber-950/40",
    },
    deleted: {
      pill: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/60",
      watermark: "text-rose-100 dark:text-rose-950/40",
    },
    blue: {
      pill: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60",
      watermark: "text-blue-100 dark:text-blue-950/40",
    },
    default: {
      pill: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-[#1c2130] dark:text-slate-300 dark:border-[#2c3349]",
      watermark: "text-slate-100 dark:text-[#1e2330]",
    },
  }[variant];

  return (
    <div
      className={cn(
        "relative rounded-[24px] p-5 overflow-hidden border transition-all duration-200 group",
        "bg-white dark:bg-[#13161f] border-slate-200/90 dark:border-[#222738] shadow-sm",
        "hover:border-blue-400 dark:hover:border-slate-600 hover:shadow-md hover:scale-[1.02]",
        "[background-image:radial-gradient(rgba(15,23,42,0.05)_1px,transparent_1px)] dark:[background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:14px_14px]"
      )}
    >
      <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border shadow-2xs", style.pill)}>
        <Icon className="w-4 h-4" />
        <span>{title}</span>
      </div>

      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{value}</div>

      <Icon
        className={cn(
          "absolute -right-3 -bottom-3 w-20 h-20 pointer-events-none transition-opacity opacity-40 group-hover:opacity-70",
          style.watermark
        )}
      />
    </div>
  );
};

interface BentoPanelProps {
  children: ReactNode;
  className?: string;
  size?: "md" | "lg";
  "data-tour"?: string;
}

export const BentoPanel: React.FC<BentoPanelProps> = ({ children, className, size = "md", ...rest }) => {
  return (
    <div
      className={cn(
        "relative border p-6",
        "bg-white dark:bg-[#13161f] border-slate-200/90 dark:border-[#222738] shadow-sm",
        "[background-image:radial-gradient(rgba(15,23,42,0.05)_1px,transparent_1px)] dark:[background-image:radial-gradient(rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:16px_16px]",
        size === "lg" ? "rounded-[32px]" : "rounded-[24px]",
        className
      )}
      {...rest}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
};

interface BentoPanelHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const BentoPanelHeader: React.FC<BentoPanelHeaderProps> = ({ title, subtitle, icon, action }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="font-semibold text-base text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

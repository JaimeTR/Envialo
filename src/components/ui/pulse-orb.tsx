import React from "react";
import { LucideIcon, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

interface PulseOrbProps {
  icon?: LucideIcon;
  active?: boolean;
}

export const PulseOrb: React.FC<PulseOrbProps> = ({ icon: Icon = Wifi, active = true }) => {
  return (
    <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
      <div
        className={cn(
          "absolute inset-0 rounded-full blur-2xl pointer-events-none",
          active ? "bg-blue-500/25 dark:bg-blue-500/30" : "bg-slate-400/15"
        )}
      />
      <svg className={cn("absolute inset-0 w-full h-full", active && "animate-spin-slow")} viewBox="0 0 144 144" fill="none">
        <defs>
          <linearGradient id="orbGradient" x1="0" y1="0" x2="144" y2="144" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6d6de6" />
            <stop offset="50%" stopColor="#5050e1" />
            <stop offset="100%" stopColor="#051a39" />
          </linearGradient>
        </defs>
        <circle
          cx="72"
          cy="72"
          r="62"
          stroke={active ? "url(#orbGradient)" : "#94a3b8"}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="12 16"
          opacity={active ? 1 : 0.4}
        />
      </svg>
      <div
        className={cn(
          "relative w-20 h-20 rounded-full flex items-center justify-center shadow-lg",
          active
            ? "bg-gradient-to-tr from-blue-600 via-blue-500 to-sky-500 shadow-blue-500/30"
            : "bg-slate-300 dark:bg-slate-700 shadow-none"
        )}
      >
        <Icon className="w-9 h-9 text-white" />
      </div>
    </div>
  );
};

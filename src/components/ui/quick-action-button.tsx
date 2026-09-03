import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionButtonProps {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

export const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon: Icon, label, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex flex-col items-center justify-center gap-2.5 py-6 rounded-2xl border transition-all",
        "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md",
        "dark:bg-[#1c2130] dark:border-[#2c3349] dark:hover:border-blue-500/40",
        disabled && "opacity-40 cursor-not-allowed hover:border-slate-200 dark:hover:border-[#2c3349] hover:shadow-none"
      )}
    >
      <Icon className="w-7 h-7 text-blue-600 dark:text-blue-400 transition-transform duration-200 group-hover:-translate-y-1 group-hover:scale-110" />
      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
    </button>
  );
};

import React from "react";

interface TransferProgressBarProps {
  progress: number;
  label: string;
}

export const TransferProgressBar: React.FC<TransferProgressBarProps> = ({ progress, label }) => {
  const pct = Math.min(100, Math.max(0, Math.round(progress)));
  return (
    <div className="mt-2.5">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-blue-600 dark:text-blue-400">{label}</span>
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-200 dark:bg-[#2c3349] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400 transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

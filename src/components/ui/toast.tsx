"use client";
import React, { useEffect } from "react";
import { CheckCircle2 } from "lucide-react";

interface SimpleToastProps {
  message: string;
  onDone: () => void;
}

export const SimpleToast: React.FC<SimpleToastProps> = ({ message, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border bg-white dark:bg-[#13161f] border-slate-200 dark:border-[#222738] max-w-xs">
      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span className="text-xs font-medium text-slate-800 dark:text-slate-200">{message}</span>
    </div>
  );
};

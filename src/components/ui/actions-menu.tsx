"use client";
import React, { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ActionItem {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
  danger?: boolean;
}

interface ActionsMenuProps {
  actions: ActionItem[];
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (actions.length === 0) return null;

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        title="Acciones"
        className="p-1.5 rounded-lg text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-[#1c2130] transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-xl border border-slate-200 dark:border-[#2c3349] bg-white dark:bg-[#1c2130] shadow-lg py-1.5 overflow-hidden">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={() => {
                  action.onClick();
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-left transition-colors",
                  action.danger
                    ? "text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222738]"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

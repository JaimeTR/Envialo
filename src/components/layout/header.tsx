"use client";
import React from "react";
import { HelpCircle, Info, Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  onHelpClick?: () => void;
  onInfoClick?: () => void;
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title, onHelpClick, onInfoClick, onMenuClick }) => {
  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-[#13161f]/90 backdrop-blur-md border-b border-slate-200/80 dark:border-[#222738] px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1c2130]"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-base font-semibold text-slate-900 dark:text-white truncate">{title}</h1>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {onInfoClick && (
          <button
            onClick={onInfoClick}
            title="Acerca de Envialo"
            className="p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#1c2130] border border-slate-200/60 dark:border-[#2c3349] transition-colors"
          >
            <Info className="w-5 h-5" />
          </button>
        )}
        {onHelpClick && (
          <button
            onClick={onHelpClick}
            title="Tutorial interactivo"
            className="p-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-50 dark:hover:bg-[#1c2130] border border-slate-200/60 dark:border-[#2c3349] transition-colors"
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        )}
      </div>
    </header>
  );
};

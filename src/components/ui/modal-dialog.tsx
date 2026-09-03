import React, { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = "md", footer }) => {
  if (!isOpen) return null;

  const sizeClass = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-2xl",
  }[size];

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className={cn("rounded-2xl shadow-2xl w-full bg-white dark:bg-[#13161f] border border-slate-200 dark:border-[#222738]", sizeClass)}>
          <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-[#222738]">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1c2130] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-200 dark:border-[#222738]">{footer}</div>
          )}
        </div>
      </div>
    </>
  );
};

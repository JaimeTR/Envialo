import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div className={cn("rounded-2xl p-6 bg-white dark:bg-[#13161f] border border-slate-200 dark:border-[#222738]", className)}>
      {children}
    </div>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ title, subtitle, icon, action }) => {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        {icon && <div className="text-xl">{icon}</div>}
        <div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="text-xs text-slate-600 dark:text-slate-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
};

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      {icon && <div className="mb-5 opacity-50 dark:text-slate-500">{icon}</div>}
      <h3 className="font-semibold text-base text-slate-900 dark:text-white">{title}</h3>
      {description && <p className="text-sm mt-2 text-slate-500 dark:text-slate-400 max-w-sm">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

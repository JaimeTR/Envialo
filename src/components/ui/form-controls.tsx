import React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}

export const StyledSelect: React.FC<SelectProps> = ({ options, value, onChange, icon }) => {
  return (
    <div className="relative w-44 shrink-0">
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
          {icon}
        </div>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full py-2.5 rounded-xl border text-xs font-semibold appearance-none focus:outline-none transition-colors cursor-pointer",
          icon ? "pl-9 pr-8" : "pl-3 pr-8",
          "bg-white border-slate-200 text-slate-800 hover:border-blue-300 focus:border-blue-600",
          "dark:bg-[#1c2130] dark:border-[#2c3349] dark:text-slate-200 dark:hover:border-blue-600/40 dark:focus:border-blue-600"
        )}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none text-slate-500 dark:text-slate-400" />
    </div>
  );
};

interface TextInputProps {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
}

export const StyledInput: React.FC<TextInputProps> = ({ placeholder, value, onChange, readOnly }) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "w-full px-3 py-2.5 rounded-xl border text-xs font-semibold focus:outline-none transition-colors",
        "bg-white border-slate-200 text-slate-800 placeholder-slate-400 hover:border-blue-300 focus:border-blue-600",
        "dark:bg-[#1c2130] dark:border-[#2c3349] dark:text-slate-200 dark:placeholder-slate-500 dark:hover:border-blue-600/40 dark:focus:border-blue-600",
        readOnly && "cursor-default opacity-80"
      )}
    />
  );
};

interface SettingsRowProps {
  label: string;
  description?: string;
  control: React.ReactNode;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({ label, description, control }) => {
  return (
    <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-slate-200 bg-white dark:border-[#222738] dark:bg-[#1c2130]/60">
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{description}</p>}
      </div>
      {control}
    </div>
  );
};

interface SegmentedControlProps {
  options: { value: string; label: string; icon?: React.ElementType }[];
  value: string;
  onChange: (value: string) => void;
  orientation?: "horizontal" | "vertical";
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({ options, value, onChange, orientation = "horizontal" }) => {
  return (
    <div
      className={cn(
        "inline-flex p-1 rounded-xl bg-slate-100 dark:bg-[#1c2130] border border-slate-200 dark:border-[#2c3349]",
        orientation === "vertical" && "flex-col"
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors",
              value === opt.value
                ? "bg-white dark:bg-[#2c3349] text-blue-700 dark:text-blue-400 shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            {Icon && <Icon className="w-3.5 h-3.5" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

interface RowToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export const RowToggle: React.FC<RowToggleProps> = ({ checked, onChange }) => {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-5 rounded-full transition-colors shrink-0",
        checked ? "bg-blue-600" : "bg-slate-200 dark:bg-[#2c3349]"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
};

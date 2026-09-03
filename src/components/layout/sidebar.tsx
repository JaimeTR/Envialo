"use client";
import React from "react";
import { Laptop2, Send, Inbox, History, Settings, X, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarWithStatus } from "@/components/ui/avatar";
import { BrandLogo } from "@/components/ui/brand-logo";
import { useConnectionType } from "@/lib/network";

export type TabId = "devices" | "send" | "receive" | "history" | "settings";

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onlineCount: number;
  alias: string;
  open: boolean;
  onClose: () => void;
}

function initialsFrom(name: string): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, onlineCount, alias, open, onClose }) => {
  const connectionType = useConnectionType();
  const ConnectionIcon = connectionType === "wifi" ? Wifi : Laptop2;

  const navigationItems: { id: TabId; name: string; icon: typeof Laptop2; badge?: string }[] = [
    { id: "devices", name: "Dispositivos", icon: Laptop2, badge: onlineCount > 0 ? String(onlineCount) : undefined },
    { id: "send", name: "Enviar", icon: Send },
    { id: "receive", name: "Recibir", icon: Inbox },
    { id: "history", name: "Historial", icon: History },
    { id: "settings", name: "Configuración", icon: Settings },
  ];

  return (
    <>
      {open && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={onClose} />
      )}

      <aside
        className={cn(
          "w-72 md:w-64 bg-white dark:bg-[#13161f] border-r border-slate-200/90 dark:border-[#222738] flex flex-col h-screen",
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0 shrink-0",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-5 border-b border-slate-100 dark:border-[#222738] flex items-center gap-2">
          <BrandLogo className="w-11 h-11 shrink-0" />
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold font-brand text-slate-900 dark:text-white tracking-tight">Envialo</h2>
          </div>
          <button onClick={onClose} className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-[#1c2130]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                data-tour={`nav-${item.id}`}
                onClick={() => {
                  onTabChange(item.id);
                  onClose();
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all text-left",
                  isCurrent
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-100/80 dark:border-blue-500/30 shadow-2xs"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#1c2130] hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-6 h-6", isCurrent ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500")} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded-full text-[11px] font-bold",
                      isCurrent
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-[#1c2130] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-[#2c3349]"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <button
          data-tour="nav-profile"
          onClick={() => {
            onTabChange("settings");
            onClose();
          }}
          className="p-3 border-t border-slate-100 dark:border-[#222738] flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-[#1c2130] transition-colors text-left"
        >
          <div className="relative shrink-0">
            <AvatarWithStatus initials={initialsFrom(alias)} status="online" size="md" />
            <div
              className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-white dark:bg-[#13161f] border border-slate-200 dark:border-[#2c3349] flex items-center justify-center"
              title={connectionType === "wifi" ? "Conectado por wifi" : "Conectado por red"}
            >
              <ConnectionIcon className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{alias}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500">Editar perfil</p>
          </div>
        </button>
      </aside>
    </>
  );
};

"use client";
import React, { useState } from "react";
import { FileUp, FolderOpen, FileText, Send, X } from "lucide-react";
import { Modal } from "@/components/ui/modal-dialog";
import { StyledButton } from "@/components/ui/badge-button-tag";
import { AvatarWithStatus } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/card";
import { Device, SelectedItem } from "@/types";
import { cn, formatBytes } from "@/lib/utils";

interface SendModalProps {
  isOpen: boolean;
  items: SelectedItem[];
  devices: Device[];
  onClose: () => void;
  onConfirm: (device: Device) => void;
  onRemoveItem: (path: string) => void;
}

export const SendModal: React.FC<SendModalProps> = ({
  isOpen,
  items,
  devices,
  onClose,
  onConfirm,
  onRemoveItem,
}) => {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  function handleClose() {
    setSelectedDeviceId(null);
    onClose();
  }

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nuevo envío"
      size="xl"
      footer={
        <>
          <StyledButton label="Cancelar" variant="outline" onClick={handleClose} />
          <StyledButton
            label="Enviar"
            icon={<Send className="w-4 h-4" />}
            disabled={items.length === 0 || !selectedDevice}
            onClick={() => {
              if (selectedDevice) onConfirm(selectedDevice);
              setSelectedDeviceId(null);
            }}
          />
        </>
      }
    >
      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-2">{items.length} elemento(s) seleccionado(s)</p>
          {items.length === 0 ? (
            <EmptyState
              icon={<FolderOpen className="w-10 h-10 animate-float-soft" />}
              title="Nada seleccionado todavía"
              description="Cierra este modal y usa los botones de Archivo o Carpeta."
            />
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {items.map((item) => (
                <li
                  key={item.path}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-[#2c3349] bg-slate-50 dark:bg-[#1c2130]"
                >
                  {item.isText ? (
                    <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  ) : item.isDirectory ? (
                    <FolderOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  ) : (
                    <FileUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate flex-1">{item.name}</span>
                  {item.size !== undefined && (
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">{formatBytes(item.size)}</span>
                  )}
                  <button onClick={() => onRemoveItem(item.path)} className="text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-2">Elige el dispositivo destino</p>
          {devices.length === 0 ? (
            <EmptyState
              icon={<Send className="w-10 h-10 animate-float-soft" />}
              title="Ningún dispositivo en línea"
              description="Cuando haya equipos detectados en tu red, aparecerán aquí para elegir a quién enviar."
            />
          ) : (
            <ul className="space-y-1.5 max-h-72 overflow-y-auto">
              {devices.map((device) => {
                const isSelected = selectedDeviceId === device.id;
                const isOffline = device.status === "offline";
                return (
                  <li key={device.id}>
                    <button
                      disabled={isOffline}
                      onClick={() => setSelectedDeviceId(device.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors",
                        isOffline && "opacity-50 cursor-not-allowed",
                        isSelected
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                          : "border-slate-200 dark:border-[#2c3349] bg-white dark:bg-[#1c2130] hover:border-blue-300 dark:hover:border-blue-500/40"
                      )}
                    >
                      <AvatarWithStatus initials={device.owner.slice(0, 2).toUpperCase()} status={device.status} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{device.owner}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 truncate">
                          {device.name}
                          {device.area ? ` · ${device.area}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Modal>
  );
};

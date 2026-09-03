"use client";
import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Modal } from "@/components/ui/modal-dialog";
import { StyledButton } from "@/components/ui/badge-button-tag";
import { AvatarWithStatus } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/card";
import { Device } from "@/types";
import { cn } from "@/lib/utils";

interface MessageModalProps {
  isOpen: boolean;
  devices: Device[];
  onClose: () => void;
  onConfirm: (device: Device, message: string) => void;
}

export const MessageModal: React.FC<MessageModalProps> = ({ isOpen, devices, onClose, onConfirm }) => {
  const [message, setMessage] = useState("");
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  function handleClose() {
    setMessage("");
    setSelectedDeviceId(null);
    onClose();
  }

  const selectedDevice = devices.find((d) => d.id === selectedDeviceId) || null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enviar mensaje a compañero"
      size="sm"
      footer={
        <>
          <StyledButton label="Cancelar" variant="outline" onClick={handleClose} />
          <StyledButton
            label="Enviar"
            icon={<MessageSquare className="w-4 h-4" />}
            disabled={!message.trim() || !selectedDevice}
            onClick={() => {
              if (selectedDevice) onConfirm(selectedDevice, message.trim());
              setMessage("");
              setSelectedDeviceId(null);
            }}
          />
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-2">Mensaje</p>
          <textarea
            autoFocus
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Ej. Recuerda enviarme el reporte antes de las 5pm"
            rows={3}
            maxLength={280}
            className="w-full px-3 py-2.5 text-xs rounded-xl border resize-none focus:outline-none transition-colors bg-white border-slate-200 text-slate-800 placeholder-slate-400 hover:border-blue-300 focus:border-blue-600 dark:bg-[#1c2130] dark:border-[#2c3349] dark:text-slate-200 dark:placeholder-slate-500"
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">{message.length}/280 — llega como notificación al abrir el programa</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-2">Elige el compañero</p>
          {devices.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-10 h-10" />}
              title="Ningún dispositivo en línea"
              description="Cuando haya equipos detectados en tu red, aparecerán aquí para elegir a quién escribir."
            />
          ) : (
            <ul className="space-y-1.5 max-h-40 overflow-y-auto">
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

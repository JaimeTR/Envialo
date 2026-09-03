"use client";
import React from "react";
import { ShieldCheck, Check, X as XIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal-dialog";
import { StyledButton } from "@/components/ui/badge-button-tag";
import { Avatar } from "@/components/ui/avatar";

interface PairRequestModalProps {
  isOpen: boolean;
  senderAlias: string;
  code: string;
  onAccept: () => void;
  onReject: () => void;
}

export const PairRequestModal: React.FC<PairRequestModalProps> = ({ isOpen, senderAlias, code, onAccept, onReject }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onReject}
      title="Solicitud de emparejamiento"
      size="sm"
      footer={
        <>
          <StyledButton label="Rechazar" variant="outline" icon={<XIcon className="w-4 h-4" />} onClick={onReject} />
          <StyledButton label="Emparejar" icon={<Check className="w-4 h-4" />} onClick={onAccept} />
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <ShieldCheck className="w-10 h-10" />
        </div>

        <div className="flex items-center gap-3 w-full p-3 rounded-xl border border-slate-200 dark:border-[#2c3349] bg-slate-50 dark:bg-[#1c2130]">
          <Avatar initials={senderAlias.slice(0, 2).toUpperCase()} color="indigo" size="md" />
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{senderAlias}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">quiere emparejarse contigo</p>
          </div>
        </div>

        <div className="w-full">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-2">Confirma que este código coincide en ambas pantallas</p>
          <p className="text-3xl font-bold tracking-[0.3em] text-blue-600 dark:text-blue-400">{code}</p>
        </div>
      </div>
    </Modal>
  );
};

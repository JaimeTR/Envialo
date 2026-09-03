"use client";
import React from "react";
import { FileUp, Check, X as XIcon } from "lucide-react";
import { Modal } from "@/components/ui/modal-dialog";
import { StyledButton } from "@/components/ui/badge-button-tag";
import { Avatar } from "@/components/ui/avatar";
import { formatBytes } from "@/lib/utils";

interface IncomingTransferModalProps {
  isOpen: boolean;
  senderAlias: string;
  fileName: string;
  fileSize: number;
  onAccept: () => void;
  onReject: () => void;
}

export const IncomingTransferModal: React.FC<IncomingTransferModalProps> = ({
  isOpen,
  senderAlias,
  fileName,
  fileSize,
  onAccept,
  onReject,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onReject}
      title="Solicitud de envío"
      size="sm"
      footer={
        <>
          <StyledButton label="Rechazar" variant="outline" icon={<XIcon className="w-4 h-4" />} onClick={onReject} />
          <StyledButton label="Recibir" icon={<Check className="w-4 h-4" />} onClick={onAccept} />
        </>
      }
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
          <FileUp className="w-10 h-10" />
        </div>

        <div className="w-full">
          <p className="text-base font-semibold text-slate-900 dark:text-white truncate">{fileName}</p>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{formatBytes(fileSize)}</p>
        </div>

        <div className="flex items-center gap-3 w-full p-3 rounded-xl border border-slate-200 dark:border-[#2c3349] bg-slate-50 dark:bg-[#1c2130]">
          <Avatar initials={senderAlias.slice(0, 2).toUpperCase()} color="indigo" size="md" />
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{senderAlias}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">quiere enviarte este archivo</p>
          </div>
        </div>
      </div>
    </Modal>
  );
};

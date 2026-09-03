"use client";
import React from "react";
import { Modal } from "@/components/ui/modal-dialog";
import { StyledButton } from "@/components/ui/badge-button-tag";
import { BrandLogo } from "@/components/ui/brand-logo";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acerca de"
      size="sm"
      footer={<StyledButton label="Cerrar" onClick={onClose} />}
    >
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <BrandLogo className="w-16 h-16" />
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1.5">Envialo v0.1.0</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Comparte archivos entre tus equipos conectados a la misma red local, sin nube y sin límites de tamaño.
          </p>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-600">
          Software de{" "}
          <a
            href="https://devmarkpe.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-500 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            Devmark
          </a>
          , desarrollado por{" "}
          <a
            href="https://jaimetr.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-slate-500 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            JaimeTR
          </a>
        </p>
      </div>
    </Modal>
  );
};

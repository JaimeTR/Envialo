"use client";
import React, { useState } from "react";
import { Modal } from "@/components/ui/modal-dialog";
import { StyledButton } from "@/components/ui/badge-button-tag";
import { StyledInput } from "@/components/ui/form-controls";

interface TextComposerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string, description: string) => void;
}

export const TextComposerModal: React.FC<TextComposerModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleClose() {
    setTitle("");
    setDescription("");
    onClose();
  }

  function handleConfirm() {
    onConfirm(title, description);
    setTitle("");
    setDescription("");
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Enviar texto"
      size="sm"
      footer={
        <>
          <StyledButton label="Cancelar" variant="outline" onClick={handleClose} />
          <StyledButton label="Agregar" onClick={handleConfirm} disabled={!title.trim() && !description.trim()} />
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-1.5">Título</p>
          <StyledInput value={title} onChange={setTitle} placeholder="Ej. Instrucciones de instalación" />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-500 mb-1.5">Descripción</p>
          <textarea
            autoFocus
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Escribe o pega el contenido que quieres enviar..."
            rows={5}
            className="w-full px-3 py-2.5 text-xs rounded-xl border resize-none focus:outline-none transition-colors bg-white border-slate-200 text-slate-800 placeholder-slate-400 hover:border-blue-300 focus:border-blue-600 dark:bg-[#1c2130] dark:border-[#2c3349] dark:text-slate-200 dark:placeholder-slate-500"
          />
        </div>
      </div>
    </Modal>
  );
};

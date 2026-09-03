import React from "react";
import { Badge, BadgeVariant } from "@/components/ui/badge-button-tag";
import { TransferStatus } from "@/types";

const STATUS_CONFIG: Record<TransferStatus, { label: string; variant: BadgeVariant }> = {
  transferring: { label: "Transfiriendo…", variant: "info" },
  pending: { label: "Pendiente de aceptar", variant: "info" },
  accepted: { label: "Aceptado", variant: "success" },
  rejected: { label: "Rechazado", variant: "error" },
  cancelled: { label: "Cancelado", variant: "neutral" },
  failed: { label: "Falló — reintentar", variant: "warning" },
};

interface TransferStatusBadgeProps {
  status: TransferStatus;
}

export const TransferStatusBadge: React.FC<TransferStatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return <Badge label={config.label} variant={config.variant} />;
};

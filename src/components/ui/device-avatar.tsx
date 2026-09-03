import React from "react";
import { Laptop2, Wifi, Smartphone } from "lucide-react";
import { AvatarWithStatus } from "@/components/ui/avatar";
import { Device } from "@/types";

interface DeviceAvatarProps {
  device: Device;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

const CONNECTION_LABEL: Record<string, string> = {
  wifi: "Conectado por wifi",
  ethernet: "Conectado por red",
  phone: "Celular",
};

export const DeviceAvatar: React.FC<DeviceAvatarProps> = ({ device, size = "sm" }) => {
  const ConnectionIcon = device.connectionType === "wifi" ? Wifi : device.connectionType === "phone" ? Smartphone : Laptop2;
  return (
    <div className="relative shrink-0">
      <AvatarWithStatus initials={device.owner.slice(0, 2).toUpperCase()} status={device.status} size={size} />
      {device.connectionType && (
        <div
          className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full bg-white dark:bg-[#1c2130] border border-slate-200 dark:border-[#2c3349] flex items-center justify-center"
          title={CONNECTION_LABEL[device.connectionType]}
        >
          <ConnectionIcon className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
        </div>
      )}
    </div>
  );
};

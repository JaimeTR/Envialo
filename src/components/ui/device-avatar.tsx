import React from "react";
import { Laptop2, Wifi } from "lucide-react";
import { AvatarWithStatus } from "@/components/ui/avatar";
import { Device } from "@/types";

interface DeviceAvatarProps {
  device: Device;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}

export const DeviceAvatar: React.FC<DeviceAvatarProps> = ({ device, size = "sm" }) => {
  const ConnectionIcon = device.connectionType === "wifi" ? Wifi : Laptop2;
  return (
    <div className="relative shrink-0">
      <AvatarWithStatus initials={device.owner.slice(0, 2).toUpperCase()} status={device.status} size={size} />
      {device.connectionType && (
        <div
          className="absolute -top-1 -right-1 w-[16px] h-[16px] rounded-full bg-white dark:bg-[#1c2130] border border-slate-200 dark:border-[#2c3349] flex items-center justify-center"
          title={device.connectionType === "wifi" ? "Conectado por wifi" : "Conectado por red"}
        >
          <ConnectionIcon className="w-2.5 h-2.5 text-blue-600 dark:text-blue-400" />
        </div>
      )}
    </div>
  );
};

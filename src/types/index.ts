export type DeviceStatus = "online" | "offline";
export type DeviceConnectionType = "wifi" | "ethernet";

export interface Device {
  id: string;
  name: string;
  owner: string;
  area?: string;
  status: DeviceStatus;
  connectionType?: DeviceConnectionType;
  paired?: boolean;
}

export interface SelectedItem {
  path: string;
  name: string;
  isDirectory: boolean;
  size?: number;
  isText?: boolean;
  textContent?: string;
}

export type TransferStatus = "transferring" | "pending" | "accepted" | "rejected" | "cancelled" | "failed";
export type TransferDirection = "sent" | "received";

export interface SentItem extends SelectedItem {
  id: string;
  deviceName: string;
  status: TransferStatus;
  progress?: number;
  timestamp: string;
  createdAt: number;
  direction: TransferDirection;
  savedPath?: string;
  transferId?: string;
}

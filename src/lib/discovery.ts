"use client";
import { useEffect, useRef, useState } from "react";
import { Device, DeviceConnectionType } from "@/types";
import { isTauri } from "@/lib/platform";

interface DiscoveredPayload {
  id: string;
  name: string;
  owner: string;
  connectionType: DeviceConnectionType;
  status: "online";
}

export function useDiscoveredDevices(
  alias: string,
  connectionType: DeviceConnectionType | "unknown",
  visible: boolean
): Device[] {
  const [devices, setDevices] = useState<Device[]>([]);
  const startedRef = useRef(false);
  const presenceRef = useRef({ alias, connectionType, visible });
  presenceRef.current = { alias, connectionType, visible };

  useEffect(() => {
    if (!isTauri()) return;
    let unlistenFound: (() => void) | undefined;
    let unlistenLost: (() => void) | undefined;
    let cancelled = false;

    async function init() {
      const { listen } = await import("@tauri-apps/api/event");
      const { invoke } = await import("@tauri-apps/api/core");

      unlistenFound = await listen<DiscoveredPayload>("device-found", (event) => {
        setDevices((prev) => {
          const idx = prev.findIndex((d) => d.id === event.payload.id);
          const device: Device = {
            id: event.payload.id,
            name: event.payload.name || event.payload.owner,
            owner: event.payload.owner,
            status: "online",
            connectionType: event.payload.connectionType,
          };
          if (idx === -1) return [...prev, device];
          const next = [...prev];
          next[idx] = device;
          return next;
        });
      });

      unlistenLost = await listen<{ id: string }>("device-lost", (event) => {
        setDevices((prev) => prev.map((d) => (d.id === event.payload.id ? { ...d, status: "offline" } : d)));
      });

      if (cancelled) return;
      const p = presenceRef.current;
      await invoke("start_discovery", {
        alias: p.alias,
        connectionType: p.connectionType === "unknown" ? "ethernet" : p.connectionType,
        visible: p.visible,
      });
      startedRef.current = true;
    }

    init();

    return () => {
      cancelled = true;
      unlistenFound?.();
      unlistenLost?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isTauri() || !startedRef.current) return;
    (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("set_presence", {
        alias,
        connectionType: connectionType === "unknown" ? "ethernet" : connectionType,
        visible,
      });
    })();
  }, [alias, connectionType, visible]);

  return devices;
}

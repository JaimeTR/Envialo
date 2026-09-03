"use client";
import { useEffect, useState } from "react";

export type ConnectionType = "wifi" | "ethernet" | "unknown";

interface NetworkInformation extends EventTarget {
  type?: string;
}

function readConnectionType(): ConnectionType {
  if (typeof navigator === "undefined") return "unknown";
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  const type = conn?.type;
  if (type === "wifi") return "wifi";
  if (type === "ethernet") return "ethernet";
  return "unknown";
}

export function useConnectionType(): ConnectionType {
  const [type, setType] = useState<ConnectionType>("unknown");

  useEffect(() => {
    setType(readConnectionType());
    const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
    if (!conn) return;
    const handler = () => setType(readConnectionType());
    conn.addEventListener("change", handler);
    return () => conn.removeEventListener("change", handler);
  }, []);

  return type;
}

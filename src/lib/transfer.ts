"use client";
import { useEffect, useState } from "react";
import { isTauri } from "@/lib/platform";
import { SelectedItem } from "@/types";

export interface IncomingItemSummary {
  name: string;
  isDirectory: boolean;
  size: number;
}

export interface IncomingTransferRequest {
  transferId: string;
  fromId: string;
  fromAlias: string;
  items: IncomingItemSummary[];
  totalSize: number;
}

export interface SendResultEvent {
  transferId: string;
  targetId: string;
  status: "accepted" | "rejected" | "failed";
  error?: string;
}

export interface ReceiveCompleteEvent {
  transferId: string;
  fromId: string;
  fromAlias: string;
  items: IncomingItemSummary[];
  savedPath: string;
}

export interface ReceiveFailedEvent {
  transferId: string;
  error: string;
}

export function useTransferEvents() {
  const [incomingRequest, setIncomingRequest] = useState<IncomingTransferRequest | null>(null);
  const [sendProgress, setSendProgress] = useState<Record<string, number>>({});
  const [sendResult, setSendResult] = useState<SendResultEvent | null>(null);
  const [receiveProgress, setReceiveProgress] = useState<Record<string, number>>({});
  const [receiveComplete, setReceiveComplete] = useState<ReceiveCompleteEvent | null>(null);
  const [receiveFailed, setReceiveFailed] = useState<ReceiveFailedEvent | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    const unlisteners: (() => void)[] = [];

    async function init() {
      const { listen } = await import("@tauri-apps/api/event");

      unlisteners.push(await listen<IncomingTransferRequest>("incoming-transfer", (e) => setIncomingRequest(e.payload)));

      unlisteners.push(
        await listen<{ transferId: string; bytesSent: number; totalBytes: number }>("send-progress", (e) => {
          const pct = e.payload.totalBytes > 0 ? (e.payload.bytesSent / e.payload.totalBytes) * 100 : 100;
          setSendProgress((prev) => ({ ...prev, [e.payload.transferId]: pct }));
        })
      );
      unlisteners.push(await listen<SendResultEvent>("send-result", (e) => setSendResult(e.payload)));

      unlisteners.push(
        await listen<{ transferId: string; bytesReceived: number; totalBytes: number }>("receive-progress", (e) => {
          const pct = e.payload.totalBytes > 0 ? (e.payload.bytesReceived / e.payload.totalBytes) * 100 : 100;
          setReceiveProgress((prev) => ({ ...prev, [e.payload.transferId]: pct }));
        })
      );
      unlisteners.push(await listen<ReceiveCompleteEvent>("receive-complete", (e) => setReceiveComplete(e.payload)));
      unlisteners.push(await listen<ReceiveFailedEvent>("receive-failed", (e) => setReceiveFailed(e.payload)));
    }

    init();
    return () => unlisteners.forEach((u) => u());
  }, []);

  async function sendTransfer(targetId: string, myAlias: string, items: SelectedItem[]): Promise<string> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("send_transfer", {
      targetId,
      myAlias,
      items: items.map((i) => ({
        path: i.path,
        name: i.name,
        isDirectory: i.isDirectory,
        isText: !!i.isText,
        textContent: i.textContent ?? null,
      })),
    });
  }

  async function respondTransfer(transferId: string, accept: boolean, downloadPath: string): Promise<void> {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("respond_transfer", { transferId, accept, downloadPath });
  }

  return {
    incomingRequest,
    clearIncomingRequest: () => setIncomingRequest(null),
    sendProgress,
    sendResult,
    receiveProgress,
    receiveComplete,
    clearReceiveComplete: () => setReceiveComplete(null),
    receiveFailed,
    clearReceiveFailed: () => setReceiveFailed(null),
    sendTransfer,
    respondTransfer,
  };
}

"use client";
import { useEffect, useRef, useState } from "react";
import { isTauri } from "@/lib/platform";

export interface IncomingPairRequest {
  fromId: string;
  fromAlias: string;
  code: string;
}

export interface PairResult {
  id: string;
  alias: string;
  accepted: boolean;
  timedOut?: boolean;
}

export function usePairing(alias: string) {
  const [pairedIds, setPairedIds] = useState<Set<string>>(new Set());
  const [incomingRequest, setIncomingRequest] = useState<IncomingPairRequest | null>(null);
  const [lastResult, setLastResult] = useState<PairResult | null>(null);
  const aliasRef = useRef(alias);
  aliasRef.current = alias;

  useEffect(() => {
    if (!isTauri()) return;
    let unlistenRequest: (() => void) | undefined;
    let unlistenResult: (() => void) | undefined;
    let cancelled = false;

    async function init() {
      const { listen } = await import("@tauri-apps/api/event");
      const { invoke } = await import("@tauri-apps/api/core");

      await invoke("start_network_listener");
      const ids = await invoke<string[]>("get_paired_devices");
      if (!cancelled) setPairedIds(new Set(ids));

      unlistenRequest = await listen<IncomingPairRequest>("pair-request", (event) => {
        setIncomingRequest(event.payload);
      });

      unlistenResult = await listen<PairResult>("pair-result", (event) => {
        setLastResult(event.payload);
        if (event.payload.accepted) {
          setPairedIds((prev) => new Set(prev).add(event.payload.id));
        }
      });
    }

    init();

    return () => {
      cancelled = true;
      unlistenRequest?.();
      unlistenResult?.();
    };
  }, []);

  async function sendPairRequest(targetId: string): Promise<string> {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("send_pair_request", { targetId, myAlias: aliasRef.current });
  }

  async function respondToRequest(request: IncomingPairRequest, accepted: boolean): Promise<void> {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("respond_pair_request", {
      fromId: request.fromId,
      fromAlias: request.fromAlias,
      myAlias: aliasRef.current,
      accepted,
    });
    if (accepted) setPairedIds((prev) => new Set(prev).add(request.fromId));
    setIncomingRequest(null);
  }

  return { pairedIds, incomingRequest, lastResult, sendPairRequest, respondToRequest, clearIncomingRequest: () => setIncomingRequest(null) };
}

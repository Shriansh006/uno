"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchState,
  getPlayerId,
  isError,
  joinRoom,
  sendAction,
  setPlayerId,
} from "@/lib/client";
import type { Action, PublicState } from "@/lib/types";
import { useMounted } from "./useMounted";

export type RoomStatus = "loading" | "need-name" | "ready" | "missing";

const FAST_POLL = 1200;
const SLOW_POLL = 4000;

export function useRoom(code: string) {
  const mounted = useMounted();
  const [playerId, setPid] = useState<string | null>(() => getPlayerId(code));
  const [nonce, setNonce] = useState(0);
  const [state, setState] = useState<PublicState | null>(null);
  const [pollStatus, setPollStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);

  useEffect(() => {
    if (!mounted || !playerId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const run = async () => {
      try {
        const res = await fetchState(code, playerId);
        if (cancelled) return;
        if (isError(res)) {
          if (res.status === 404) {
            setPollStatus("missing");
            return;
          }
          setError(res.error);
        } else if (!res.state.you) {
          setPollStatus("ready");
          setPid(null);
          return;
        } else {
          setState(res.state);
          setPollStatus("ready");
          setError(null);
        }
      } catch {
        /* network hiccup, keep polling */
      }
      if (!cancelled) {
        timer = setTimeout(run, document.hidden ? SLOW_POLL : FAST_POLL);
      }
    };

    void run();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [code, playerId, nonce, mounted]);

  const join = useCallback(
    async (name: string) => {
      setError(null);
      const res = await joinRoom(code, name, getPlayerId(code) ?? undefined);
      if (isError(res)) {
        if (res.status === 404) setPollStatus("missing");
        else setError(res.error);
        return false;
      }
      setPlayerId(code, res.playerId);
      setPid(res.playerId);
      setState(res.state);
      setPollStatus("ready");
      setNonce((value) => value + 1);
      return true;
    },
    [code],
  );

  const act = useCallback(
    async (action: Action) => {
      if (!playerId || pendingRef.current) return false;
      pendingRef.current = true;
      setPending(true);
      try {
        const res = await sendAction(code, playerId, action);
        if (isError(res)) {
          setError(res.error);
          if (res.status === 404) setPollStatus("missing");
          return false;
        }
        setState(res.state);
        setError(null);
        return true;
      } catch {
        setError("Could not reach the table.");
        return false;
      } finally {
        pendingRef.current = false;
        setPending(false);
      }
    },
    [code, playerId],
  );

  const status: RoomStatus = !mounted
    ? "loading"
    : !playerId
      ? "need-name"
      : pollStatus;

  return { playerId, state, status, error, pending, join, act, setError };
}

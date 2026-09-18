"use client";

import { useEffect, useRef, useState } from "react";
import type { LogEntry } from "@/lib/types";

const KIND_STYLE: Record<LogEntry["kind"], string> = {
  info: "border-white/10 bg-felt-800/95 text-white/80",
  play: "border-white/10 bg-felt-800/95 text-white",
  draw: "border-white/10 bg-felt-800/95 text-white/80",
  uno: "border-uno-yellow/40 bg-felt-800/95 text-uno-yellow",
  win: "border-uno-green/50 bg-felt-800/95 text-uno-green",
  error: "border-uno-red/50 bg-felt-800/95 text-uno-red",
};

export function ToastStack({ log }: { log: LogEntry[] }) {
  const [toasts, setToasts] = useState<LogEntry[]>([]);
  const lastSeen = useRef<string | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    if (!log.length) return;
    const last = log[log.length - 1];
    if (last.id === lastSeen.current) return;

    let fresh: LogEntry[];
    if (lastSeen.current) {
      const index = log.findIndex((entry) => entry.id === lastSeen.current);
      fresh = index === -1 ? [last] : log.slice(index + 1);
    } else {
      fresh = [last];
    }
    lastSeen.current = last.id;

    for (const entry of fresh) {
      setToasts((current) => [...current.slice(-3), entry]);
      const timer = setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== entry.id));
        timers.current.delete(entry.id);
      }, 3200);
      timers.current.set(entry.id, timer);
    }
  }, [log]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      for (const timer of map.values()) clearTimeout(timer);
    };
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-2 z-40 flex flex-col items-center gap-1.5 px-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-in max-w-[92vw] rounded-full border px-4 py-1.5 text-center text-sm shadow-lg backdrop-blur ${KIND_STYLE[toast.kind]}`}
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}

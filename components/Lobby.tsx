"use client";

import { useState } from "react";
import { copyText } from "@/lib/client";
import { MAX_PLAYERS, type Action, type PublicState } from "@/lib/types";
import { COLOR_HEX } from "./UnoCard";

const AVATAR_COLORS = [COLOR_HEX.red, COLOR_HEX.blue, COLOR_HEX.green, COLOR_HEX.yellow];

export function Lobby({
  state,
  act,
  pending,
  error,
  setError,
  code,
  shareUrl,
  onLeave,
}: {
  state: PublicState;
  act: (action: Action) => Promise<boolean>;
  pending: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  code: string;
  shareUrl: string;
  onLeave: () => void;
}) {
  const [copied, setCopied] = useState<null | "code" | "link">(null);
  const isHost = state.you === state.hostId;

  const copy = async (value: string, kind: "code" | "link") => {
    const ok = await copyText(value);
    if (ok) {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1600);
    }
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-2xl flex-col gap-4 px-4 py-6">
      <header className="flex items-center justify-between">
        <button
          type="button"
          onClick={onLeave}
          className="text-sm text-white/50 transition hover:text-white"
        >
          ← Leave
        </button>
        <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-widest text-white/50">
          Lobby
        </span>
      </header>

      <section className="rise rounded-3xl border border-white/10 bg-felt-800/70 p-6 text-center shadow-xl backdrop-blur">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Room code</p>
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="mt-2 font-mono text-5xl font-black tracking-[0.35em] text-white transition hover:text-uno-yellow sm:text-6xl"
          title="Copy code"
        >
          {code}
        </button>
        <p className="mt-2 text-sm text-white/50">
          {copied === "code" ? "Code copied!" : "Tap the code to copy it"}
        </p>

        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/20 p-2">
          <span className="min-w-0 flex-1 truncate px-2 text-left text-sm text-white/60">
            {shareUrl}
          </span>
          <button
            type="button"
            onClick={() => copy(shareUrl, "link")}
            className="shrink-0 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90 active:scale-95"
          >
            {copied === "link" ? "Copied!" : "Copy link"}
          </button>
        </div>
      </section>

      <section className="rise rounded-3xl border border-white/10 bg-felt-800/70 p-5 shadow-xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">
            Players{" "}
            <span className="text-white/40">
              {state.players.length}/{MAX_PLAYERS}
            </span>
          </h2>
          {isHost ? (
            <button
              type="button"
              disabled={pending || state.players.length >= MAX_PLAYERS}
              onClick={() => act({ type: "addBot" })}
              className="rounded-xl border border-white/15 px-3 py-1.5 text-sm transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              + Add bot
            </button>
          ) : null}
        </div>

        <ul className="flex flex-col gap-2">
          {state.players.map((player, index) => (
            <li
              key={player.id}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/20 px-3 py-2"
            >
              <span
                className="grid h-9 w-9 place-items-center rounded-full text-sm font-bold text-white shadow-inner"
                style={{ background: AVATAR_COLORS[index % AVATAR_COLORS.length] }}
              >
                {player.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 truncate font-medium">
                {player.name}
                {player.id === state.you ? (
                  <span className="ml-2 text-xs text-white/40">you</span>
                ) : null}
              </span>
              {player.isBot ? (
                <span className="rounded-full bg-uno-blue/20 px-2 py-0.5 text-xs text-uno-blue">
                  BOT
                </span>
              ) : null}
              {player.id === state.hostId ? (
                <span className="rounded-full bg-uno-yellow/20 px-2 py-0.5 text-xs text-uno-yellow">
                  HOST
                </span>
              ) : null}
              {isHost && player.isBot ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => act({ type: "removeBot", targetId: player.id })}
                  className="text-xs text-white/40 transition hover:text-uno-red disabled:opacity-40"
                >
                  remove
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        {error ? (
          <p className="mt-3 rounded-xl border border-uno-red/40 bg-uno-red/10 px-3 py-2 text-sm text-uno-red">
            {error}
          </p>
        ) : null}

        <div className="mt-5">
          {isHost ? (
            <button
              type="button"
              disabled={pending || state.players.length < 2}
              onClick={() => {
                setError(null);
                act({ type: "start" });
              }}
              className="w-full rounded-2xl bg-uno-green py-4 text-lg font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none"
            >
              {state.players.length < 2 ? "Add at least one more player" : "Start game"}
            </button>
          ) : (
            <p className="rounded-2xl border border-white/10 bg-black/20 py-4 text-center text-white/60">
              Waiting for the host to start…
            </p>
          )}
        </div>
      </section>

      <details className="rise rounded-3xl border border-white/10 bg-felt-800/50 p-5 text-sm text-white/70">
        <summary className="cursor-pointer font-semibold text-white">
          How to play
        </summary>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-white/60">
          <li>Match the top card by color or number. Wilds can be played anytime.</li>
          <li><b>Skip</b> skips the next player. <b>Reverse</b> flips direction.</li>
          <li><b>+2</b> and <b>Wild +4</b> make the next player draw and lose their turn.</li>
          <li>Down to one card? Hit <b>UNO!</b> before someone catches you — it&apos;s a 2-card penalty.</li>
          <li>First to empty their hand wins the round. Card values become points (first to 500 wins).</li>
        </ul>
      </details>
    </div>
  );
}

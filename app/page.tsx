"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMounted } from "@/hooks/useMounted";
import {
  addRecentRoom,
  createRoom,
  getRecentRooms,
  getStoredName,
  isError,
  saveName,
  setPlayerId,
  type RecentRoom,
} from "@/lib/client";

const TITLE = [
  { char: "U", color: "#e23b3b", tilt: -7 },
  { char: "N", color: "#f2b705", tilt: 5 },
  { char: "O", color: "#2d7df6", tilt: -4 },
];

export default function Home() {
  const router = useRouter();
  const mounted = useMounted();
  const [name, setName] = useState(() => getStoredName());
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<null | "create" | "bots" | "join">(null);
  const [error, setError] = useState<string | null>(null);
  const [recent] = useState<RecentRoom[]>(() => getRecentRooms());

  const displayName = () => name.trim().slice(0, 16) || "Player";

  const handleCreate = async (withBots: boolean) => {
    setBusy(withBots ? "bots" : "create");
    setError(null);
    saveName(displayName());
    const res = await createRoom(displayName(), withBots ? { bots: 3, start: true } : {});
    if (isError(res)) {
      setError(res.error);
      setBusy(null);
      return;
    }
    setPlayerId(res.code, res.playerId);
    addRecentRoom(res.code);
    router.push(`/room/${res.code}`);
  };

  const handleJoin = (event: FormEvent) => {
    event.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length < 4) {
      setError("Enter the 4-letter room code.");
      return;
    }
    setError(null);
    saveName(displayName());
    router.push(`/room/${clean}`);
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col justify-center gap-6 px-5 py-10">
      <div className="text-center">
        <div className="mb-4 flex justify-center gap-2">
          {TITLE.map((letter) => (
            <span
              key={letter.char}
              className="grid h-20 w-14 place-items-center rounded-xl border-2 border-white/70 font-black text-white shadow-[0_10px_24px_-10px_rgba(0,0,0,0.9)] sm:h-24 sm:w-17"
              style={{
                background: letter.color,
                transform: `rotate(${letter.tilt}deg)`,
                fontSize: "2.25rem",
              }}
            >
              {letter.char}
            </span>
          ))}
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">UNO with friends</h1>
        <p className="mt-1 text-sm text-white/55">
          No signup. Create a table, share the code, play in seconds — or jump into a
          game against bots.
        </p>
      </div>

      <div className="rise rounded-3xl border border-white/10 bg-felt-800/70 p-5 shadow-xl backdrop-blur">
        <label className="mb-1 block text-xs uppercase tracking-widest text-white/40">
          Your name
        </label>
        <input
          value={mounted ? name : ""}
          onChange={(event) => setName(event.target.value)}
          maxLength={16}
          placeholder="Player"
          className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
        />

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => handleCreate(false)}
            className="w-full rounded-2xl bg-uno-green py-3.5 text-lg font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
          >
            {busy === "create" ? "Creating…" : "Create a room"}
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => handleCreate(true)}
            className="w-full rounded-2xl border border-white/15 bg-white/5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 active:scale-[0.98] disabled:opacity-50"
          >
            {busy === "bots" ? "Dealing…" : "Quick play vs 3 bots"}
          </button>
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-white/30">
          <span className="h-px flex-1 bg-white/10" />
          or join a friend
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleJoin} className="flex gap-2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={6}
            placeholder="ROOM CODE"
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono uppercase tracking-[0.3em] text-white outline-none transition placeholder:tracking-widest placeholder:text-white/30 focus:border-white/30"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-white px-5 py-3 font-semibold text-black transition hover:bg-white/90 active:scale-95"
          >
            Join
          </button>
        </form>

        {error ? (
          <p className="mt-3 rounded-xl border border-uno-red/40 bg-uno-red/10 px-3 py-2 text-sm text-uno-red">
            {error}
          </p>
        ) : null}
      </div>

      {mounted && recent.length ? (
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="mb-2 text-xs uppercase tracking-widest text-white/40">
            Pick up where you left off
          </p>
          <div className="flex flex-wrap gap-2">
            {recent.map((room) => (
              <button
                key={room.code}
                type="button"
                onClick={() => router.push(`/room/${room.code}`)}
                className="rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono tracking-widest text-white/80 transition hover:bg-white/10"
              >
                {room.code}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <p className="text-center text-xs text-white/30">
        Wild +4 is playable anytime. Down to one card? Call UNO before you get caught.
      </p>
    </main>
  );
}

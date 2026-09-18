"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { GameTable } from "@/components/GameTable";
import { Lobby } from "@/components/Lobby";
import { useRoom } from "@/hooks/useRoom";
import { addRecentRoom, copyText, getStoredName, saveName } from "@/lib/client";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const code = String(params?.code ?? "").toUpperCase();
  return <RoomView key={code} code={code} />;
}

function RoomView({ code }: { code: string }) {
  const router = useRouter();
  const room = useRoom(code);
  const [name, setName] = useState(() => getStoredName());
  const [copied, setCopied] = useState(false);
  const [shareUrl] = useState(() =>
    typeof window === "undefined"
      ? `/room/${code}`
      : `${window.location.origin}/room/${code}`,
  );

  useEffect(() => {
    if (code) addRecentRoom(code);
  }, [code]);

  const handleCopy = async () => {
    const ok = await copyText(shareUrl || code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };

  const handleLeaveLobby = async () => {
    await room.act({ type: "leave" });
    router.push("/");
  };

  const handleLeaveTable = () => {
    router.push("/");
  };

  if (room.status === "loading") {
    return (
      <main className="grid min-h-[100dvh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-sm text-white/50">Finding the table…</p>
        </div>
      </main>
    );
  }

  if (room.status === "missing") {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-3xl font-bold">Room not found</h1>
        <p className="text-white/55">
          The code <span className="font-mono tracking-widest text-white">{code}</span>{" "}
          isn&apos;t active. It may have expired after everyone left.
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          className="rounded-2xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-white/90"
        >
          Back home
        </button>
      </main>
    );
  }

  if (room.status === "need-name" || !room.state) {
    return (
      <main className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col justify-center gap-5 px-6">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Joining</p>
          <h1 className="mt-1 font-mono text-4xl font-black tracking-[0.35em] text-white">
            {code}
          </h1>
        </div>
        <form
          onSubmit={async (event: FormEvent) => {
            event.preventDefault();
            const trimmed = name.trim().slice(0, 16) || "Player";
            saveName(trimmed);
            await room.join(trimmed);
          }}
          className="rise rounded-3xl border border-white/10 bg-felt-800/70 p-5 shadow-xl backdrop-blur"
        >
          <label className="mb-1 block text-xs uppercase tracking-widest text-white/40">
            Your name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={16}
            placeholder="Player"
            autoFocus
            className="mb-4 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-white/30"
          />
          <button
            type="submit"
            className="w-full rounded-2xl bg-uno-green py-3.5 text-lg font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98]"
          >
            Take a seat
          </button>
          {room.error ? (
            <p className="mt-3 rounded-xl border border-uno-red/40 bg-uno-red/10 px-3 py-2 text-sm text-uno-red">
              {room.error}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="mt-3 w-full text-center text-sm text-white/40 transition hover:text-white"
          >
            ← Back home
          </button>
        </form>
      </main>
    );
  }

  if (!room.state) {
    return (
      <main className="grid min-h-[100dvh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p className="text-sm text-white/50">Finding the table…</p>
        </div>
      </main>
    );
  }

  if (room.state.phase === "lobby") {
    return (
      <Lobby
        state={room.state}
        act={room.act}
        pending={room.pending}
        error={room.error}
        setError={room.setError}
        code={code}
        shareUrl={shareUrl || `/room/${code}`}
        onLeave={handleLeaveLobby}
      />
    );
  }

  return (
    <GameTable
      state={room.state}
      act={room.act}
      pending={room.pending}
      error={room.error}
      setError={room.setError}
      code={code}
      onLeave={handleLeaveTable}
      copied={copied}
      onCopyCode={handleCopy}
    />
  );
}

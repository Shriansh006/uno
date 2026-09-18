"use client";

import { useEffect, useState } from "react";
import type { Action, Card, Color, PublicPlayer, PublicState } from "@/lib/types";
import { ColorPicker } from "./ColorPicker";
import { Confetti } from "./Confetti";
import { ToastStack } from "./ToastStack";
import { COLOR_HEX, COLOR_NAME, UnoBack, UnoCard } from "./UnoCard";

const AVATAR_COLORS = [COLOR_HEX.red, COLOR_HEX.blue, COLOR_HEX.green, COLOR_HEX.yellow];

function useViewportWidth() {
  const [width, setWidth] = useState(1024);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}

function DirectionIcon({ direction, size = 18 }: { direction: 1 | -1; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: direction === 1 ? "scaleX(1)" : "scaleX(-1)" }}
    >
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4.5V9h-4.5" />
    </svg>
  );
}

function PlayerChip({
  player,
  isYou,
  canCatch,
  pending,
  onCatch,
}: {
  player: PublicPlayer;
  isYou: boolean;
  canCatch: boolean;
  pending: boolean;
  onCatch: () => void;
}) {
  const initials = player.name.replace(/\(bot\)/i, "").trim().slice(0, 1).toUpperCase();
  const avatarIndex = player.name.length % AVATAR_COLORS.length;

  return (
    <div
      className={[
        "relative flex shrink-0 items-center gap-2 rounded-2xl border px-2.5 py-1.5 transition",
        player.isTurn
          ? "turn-pulse border-uno-yellow/70 bg-uno-yellow/10"
          : "border-white/10 bg-black/25",
        player.connected ? "" : "opacity-50",
      ].join(" ")}
    >
      <span
        className="grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white shadow"
        style={{ background: AVATAR_COLORS[avatarIndex] }}
      >
        {initials}
      </span>
      <div className="flex flex-col leading-tight">
        <span className="max-w-[9rem] truncate text-sm font-medium">
          {player.name}
          {isYou ? <span className="ml-1 text-[10px] text-white/40">you</span> : null}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-white/50">
          <span className="inline-block h-2.5 w-3.5 rounded-[3px] bg-white/80 align-middle" />
          {player.handCount}
          {player.isBot ? <span className="text-uno-blue">· bot</span> : null}
        </span>
      </div>

      {player.vulnerable && !isYou ? (
        <button
          type="button"
          disabled={pending}
          onClick={onCatch}
          className={`ml-1 rounded-full px-2 py-1 text-[11px] font-bold transition ${
            canCatch
              ? "bg-uno-red text-white hover:brightness-110 active:scale-95"
              : "bg-white/10 text-white/50"
          }`}
          title={`Catch ${player.name} not saying UNO`}
        >
          Catch!
        </button>
      ) : null}

      {player.handCount === 1 ? (
        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-uno-red px-1.5 py-0.5 text-[10px] font-black text-white shadow">
          1
        </span>
      ) : null}
    </div>
  );
}

function Overlay({
  state,
  isHost,
  pending,
  onNextRound,
  onNewGame,
}: {
  state: PublicState;
  isHost: boolean;
  pending: boolean;
  onNextRound: () => void;
  onNewGame: () => void;
}) {
  const winner = state.players.find((player) => player.id === state.winnerId);
  const gameOver = state.phase === "gameEnd";

  return (
    <>
      <Confetti count={gameOver ? 110 : 70} />
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
        <div className="zoom-in w-full max-w-md rounded-3xl border border-white/10 bg-felt-800/95 p-6 text-center shadow-2xl">
          <p className="text-xs uppercase tracking-[0.35em] text-white/40">
            {gameOver ? "Game over" : `Round ${state.round} complete`}
          </p>
          <h2 className="mt-2 text-2xl font-bold">
            {winner?.name ?? "Someone"} {gameOver ? "wins!" : "takes the round"}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            {gameOver ? "First to 500 points." : "Points from everyone's remaining cards."}
          </p>

          <ul className="mt-5 flex flex-col gap-1.5 text-left">
            {state.scores.map((row, index) => (
              <li
                key={row.id}
                className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm"
              >
                <span className="flex items-center gap-2">
                  <span className="text-white/40">#{index + 1}</span>
                  <span className="max-w-[10rem] truncate">{row.name}</span>
                  {row.id === state.you ? (
                    <span className="text-xs text-white/40">you</span>
                  ) : null}
                </span>
                <span className="font-mono font-semibold">{row.score}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6">
            {isHost ? (
              <button
                type="button"
                disabled={pending}
                onClick={gameOver ? onNewGame : onNextRound}
                className="w-full rounded-2xl bg-uno-green py-3.5 text-lg font-bold text-white shadow-lg transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
              >
                {gameOver ? "New game" : "Next round"}
              </button>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-black/20 py-3.5 text-white/60">
                Waiting for the host…
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function GameTable({
  state,
  act,
  pending,
  error,
  setError,
  code,
  onLeave,
  copied,
  onCopyCode,
}: {
  state: PublicState;
  act: (action: Action) => Promise<boolean>;
  pending: boolean;
  error: string | null;
  setError: (value: string | null) => void;
  code: string;
  onLeave: () => void;
  copied: boolean;
  onCopyCode: () => void;
}) {
  const viewport = useViewportWidth();
  const [pendingWild, setPendingWild] = useState<Card | null>(null);
  const [showScores, setShowScores] = useState(false);

  const isMyTurn = state.turnPlayerId != null && state.turnPlayerId === state.you;
  const turnPlayer = state.players.find((player) => player.id === state.turnPlayerId);
  const isHost = state.you === state.hostId;
  const currentHex = COLOR_HEX[state.currentColor];

  const handWidth =
    viewport < 420 ? 46 : viewport < 640 ? 52 : viewport < 1024 ? 58 : 64;
  const pileWidth = viewport < 480 ? 62 : 74;
  const overlap = state.hand.length > 10 ? (viewport < 640 ? 16 : 22) : 0;

  const play = (card: Card) => {
    setError(null);
    if (!state.playableIds.includes(card.id)) return;
    if (card.color === "wild") {
      setPendingWild(card);
      return;
    }
    act({ type: "play", cardId: card.id });
  };

  const pickColor = async (color: Color) => {
    const card = pendingWild;
    setPendingWild(null);
    if (card) await act({ type: "play", cardId: card.id, color });
  };

  const statusText = isMyTurn
    ? state.turnStage === "drawn"
      ? "You drew — play it or pass"
      : "Your turn — play a card or draw"
    : turnPlayer
      ? `Waiting for ${turnPlayer.name}…`
      : "Waiting…";

  return (
    <div className="relative flex h-[100dvh] flex-col overflow-hidden">
      <ToastStack log={state.log} />

      <header className="flex items-center justify-between gap-2 px-3 pt-3 sm:px-5">
        <button
          type="button"
          onClick={onCopyCode}
          className="flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-sm transition hover:bg-white/10"
          title="Copy room code"
        >
          <span className="font-black tracking-widest text-white">UNO</span>
          <span className="font-mono text-white/60">{copied ? "copied!" : code}</span>
        </button>

        <div className="flex items-center gap-2 text-sm">
          <span className="hidden rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-white/60 sm:inline">
            Round {state.round}
          </span>
          <button
            type="button"
            onClick={() => setShowScores(true)}
            className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 transition hover:bg-white/10"
          >
            Scores
          </button>
          <button
            type="button"
            onClick={onLeave}
            className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            Leave
          </button>
        </div>
      </header>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-3 sm:flex-wrap sm:justify-center sm:px-5">
          {state.players.map((player) => (
            <PlayerChip
              key={player.id}
              player={player}
              isYou={player.id === state.you}
              canCatch={player.id !== state.you}
              pending={pending}
              onCatch={() => {
                setError(null);
                act({ type: "catch", targetId: player.id });
              }}
            />
          ))}
        </div>

        <div className="relative flex flex-1 items-center justify-center gap-6 sm:gap-12">
          <div className="flex flex-col items-center gap-2">
            <UnoBack
              width={pileWidth}
              onClick={state.canDraw ? () => act({ type: "draw" }) : undefined}
              disabled={!state.canDraw || pending}
              label="Draw a card"
            />
            <span className="text-xs text-white/50">
              {state.canDraw ? "Tap to draw" : `${state.deckCount} in deck`}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div
              className="rounded-3xl p-2"
              style={{
                background: `${currentHex}22`,
                boxShadow: `0 0 0 2px ${currentHex}, 0 0 40px ${currentHex}66`,
              }}
            >
              {state.topCard ? (
                <UnoCard key={state.topCard.id} card={state.topCard} width={pileWidth} animate />
              ) : (
                <UnoBack width={pileWidth} />
              )}
            </div>
            <span className="flex items-center gap-2 text-xs text-white/60">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: currentHex }} />
              {COLOR_NAME[state.currentColor]}
              <span className="text-white/30">·</span>
              <DirectionIcon direction={state.direction} size={14} />
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/30 px-2 pb-2 pt-2 backdrop-blur">
        <div className="mb-1 flex min-h-[34px] flex-wrap items-center justify-center gap-2">
          {pending ? (
            <span className="text-sm text-white/40">sending…</span>
          ) : (
            <span className={`text-sm ${isMyTurn ? "font-semibold text-uno-yellow" : "text-white/50"}`}>
              {statusText}
            </span>
          )}

          {state.canPass ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => act({ type: "pass" })}
              className="rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm font-medium transition hover:bg-white/10 disabled:opacity-50"
            >
              Pass
            </button>
          ) : null}

          {state.mustCallUno ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => act({ type: "uno" })}
              className="animate-pulse rounded-full bg-uno-red px-5 py-1.5 text-sm font-black tracking-wide text-white shadow-lg transition hover:brightness-110 disabled:opacity-50"
            >
              UNO!
            </button>
          ) : null}
        </div>

        {error ? (
          <p className="mb-1 text-center text-xs text-uno-red">{error}</p>
        ) : null}

        {state.drawnCard ? (
          <p className="mb-1 text-center text-xs text-white/60">
            You drew {cardName(state.drawnCard)} — play it or pass.
          </p>
        ) : null}

        <div className="no-scrollbar flex items-end gap-1 overflow-x-auto pb-1 pt-5 sm:justify-center">
          {state.hand.length === 0 ? (
            <span className="py-6 text-sm text-white/40">
              {state.phase === "playing" ? "No cards — nice." : "Waiting…"}
            </span>
          ) : (
            state.hand.map((card, index) => {
              const playable = state.playableIds.includes(card.id);
              return (
                <UnoCard
                  key={card.id}
                  card={card}
                  width={handWidth}
                  playable={playable}
                  dim={isMyTurn && !playable}
                  tilt={(index - (state.hand.length - 1) / 2) * 1.4}
                  onClick={() => play(card)}
                  title={cardName(card)}
                  style={index === 0 ? undefined : { marginLeft: -overlap }}
                />
              );
            })
          )}
        </div>
      </footer>

      {pendingWild ? (
        <ColorPicker onPick={pickColor} onCancel={() => setPendingWild(null)} />
      ) : null}

      {showScores ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => setShowScores(false)}
        >
          <div
            className="zoom-in w-full max-w-sm rounded-3xl border border-white/10 bg-felt-800/95 p-5 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-3 text-center text-lg font-semibold">Scores</h2>
            <ul className="flex flex-col gap-1.5">
              {state.scores.map((row, index) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-black/20 px-3 py-2 text-sm"
                >
                  <span className="flex items-center gap-2">
                    <span className="text-white/40">#{index + 1}</span>
                    <span className="max-w-[10rem] truncate">{row.name}</span>
                  </span>
                  <span className="font-mono font-semibold">{row.score}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-center text-xs text-white/40">First to 500 wins.</p>
          </div>
        </div>
      ) : null}

      {state.phase === "roundEnd" || state.phase === "gameEnd" ? (
        <Overlay
          state={state}
          isHost={isHost}
          pending={pending}
          onNextRound={() => act({ type: "nextRound" })}
          onNewGame={() => act({ type: "newGame" })}
        />
      ) : null}
    </div>
  );
}

function cardName(card: Card): string {
  const color = card.color === "wild" ? "" : `${COLOR_NAME[card.color]} `;
  switch (card.value) {
    case "skip":
      return `${color}Skip`;
    case "reverse":
      return `${color}Reverse`;
    case "draw2":
      return `${color}+2`;
    case "wild":
      return "Wild";
    case "wild4":
      return "Wild +4";
    default:
      return `${color}${card.value}`;
  }
}

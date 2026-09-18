"use client";

import { useMemo, type CSSProperties } from "react";

const PIECE_COLORS = ["#e23b3b", "#f2b705", "#2fa84f", "#2d7df6", "#ffffff"];

function seededRandom(seed: number) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function buildPieces(count: number) {
  const random = seededRandom(20260919);
  return Array.from({ length: count }, (_, index) => ({
    left: random() * 100,
    delay: random() * 1.6,
    duration: 2.3 + random() * 1.9,
    drift: (random() - 0.5) * 180,
    color: PIECE_COLORS[index % PIECE_COLORS.length],
  }));
}

export function Confetti({ count = 70 }: { count?: number }) {
  const pieces = useMemo(() => buildPieces(count), [count]);

  return (
    <div className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((piece, index) => (
        <span
          key={index}
          className="confetti-piece"
          style={
            {
              left: `${piece.left}%`,
              background: piece.color,
              "--delay": `${piece.delay}s`,
              "--dur": `${piece.duration}s`,
              "--drift": `${piece.drift}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

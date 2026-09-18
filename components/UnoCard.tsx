"use client";

import type { CSSProperties } from "react";
import type { Card, Color, CardValue } from "@/lib/types";

export const COLOR_HEX: Record<Color, string> = {
  red: "#e23b3b",
  yellow: "#f2b705",
  green: "#2fa84f",
  blue: "#2d7df6",
};

export const COLOR_NAME: Record<Color, string> = {
  red: "Red",
  yellow: "Yellow",
  green: "Green",
  blue: "Blue",
};


function cornerLabel(value: CardValue): string {
  switch (value) {
    case "skip":
      return "S";
    case "reverse":
      return "R";
    case "draw2":
      return "+2";
    case "wild":
      return "W";
    case "wild4":
      return "+4";
    default:
      return value;
  }
}

function SkipIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3.2}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="8.4" />
      <line x1="6.2" y1="17.8" x2="17.8" y2="6.2" />
    </svg>
  );
}

function ReverseIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8.5h12l-3.4-3.4" />
      <path d="M20 15.5H8l3.4 3.4" />
    </svg>
  );
}

function CardGlyph({
  card,
  size,
  color,
}: {
  card: Card;
  size: number;
  color: string;
}) {
  switch (card.value) {
    case "skip":
      return <SkipIcon size={size} color={color} />;
    case "reverse":
      return <ReverseIcon size={size} color={color} />;
    case "draw2":
      return (
        <span className="uno-glyph" style={{ fontSize: size * 0.86, color }}>
          +2
        </span>
      );
    case "wild":
    case "wild4":
      return (
        <span className="uno-glyph" style={{ fontSize: size * 0.8, color: "#fff" }}>
          {card.value === "wild4" ? "+4" : "W"}
        </span>
      );
    default:
      return (
        <span className="uno-glyph" style={{ fontSize: size, color }}>
          {card.value}
        </span>
      );
  }
}

export interface UnoCardProps {
  card: Card;
  width?: number;
  playable?: boolean;
  dim?: boolean;
  tilt?: number;
  animate?: boolean;
  onClick?: () => void;
  title?: string;
  style?: CSSProperties;
}

export function UnoCard({
  card,
  width = 60,
  playable = false,
  dim = false,
  tilt = 0,
  animate = false,
  onClick,
  title,
  style,
}: UnoCardProps) {
  const isWild = card.color === "wild";
  const hex = isWild ? "#15161a" : COLOR_HEX[card.color as Color];
  const ovalBackground = isWild
    ? "conic-gradient(from 45deg, #e23b3b 0deg 90deg, #f2b705 90deg 180deg, #2fa84f 180deg 270deg, #2d7df6 270deg 360deg)"
    : "#ffffff";

  const glyphColor = isWild ? "#15161a" : hex;
  const cornerColor = isWild ? "#ffffff" : "#ffffff";

  return (
    <button
      type="button"
      onClick={playable ? onClick : undefined}
      disabled={!playable}
      title={title}
      aria-label={title}
      className={[
        "uno-card no-scrollbar",
        playable ? "playable-card" : "",
        animate ? "card-land" : "",
        onClick && !playable ? "cursor-default" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        {
          "--card-w": `${width}px`,
          width,
          height: width * 1.45,
          "--tilt": `${tilt}deg`,
          transform: tilt ? `rotate(${tilt}deg)` : undefined,
          filter: dim ? "brightness(0.68) saturate(0.8)" : undefined,
          opacity: dim ? 0.85 : 1,
          ...style,
        } as CSSProperties
      }
    >
      <div className="uno-card-inner" style={{ background: hex }}>
        <div className="uno-oval" style={{ background: ovalBackground }}>
          <CardGlyph card={card} size={width * 0.44} color={glyphColor} />
        </div>
        <span
          className="uno-corner tl"
          style={{ fontSize: width * 0.17, color: cornerColor }}
        >
          {cornerLabel(card.value)}
        </span>
        <span
          className="uno-corner br"
          style={{ fontSize: width * 0.17, color: cornerColor }}
        >
          {cornerLabel(card.value)}
        </span>
      </div>
    </button>
  );
}

export function UnoBack({
  width = 60,
  onClick,
  disabled,
  label,
}: {
  width?: number;
  onClick?: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      aria-label={label ?? "UNO card back"}
      className={`uno-back ${onClick && !disabled ? "cursor-pointer" : ""}`}
      style={
        {
          "--card-w": `${width}px`,
          width,
          height: width * 1.45,
        } as CSSProperties
      }
    >
      <div className="uno-back-inner">
        <div className="uno-back-oval">
          <span style={{ fontSize: width * 0.34 }}>UNO</span>
        </div>
      </div>
    </button>
  );
}

export function colorHex(color: Color): string {
  return COLOR_HEX[color];
}


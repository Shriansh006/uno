"use client";

import { COLORS, type Color } from "@/lib/types";
import { COLOR_HEX, COLOR_NAME } from "./UnoCard";

export function ColorPicker({
  onPick,
  onCancel,
}: {
  onPick: (color: Color) => void;
  onCancel: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/65 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Choose a color"
    >
      <div
        className="zoom-in w-full max-w-sm rounded-3xl border border-white/10 bg-felt-800/95 p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-1 text-center text-lg font-semibold">Choose a color</h2>
        <p className="mb-4 text-center text-sm text-white/50">
          Your wild card becomes this color.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onPick(color)}
              className="group h-20 rounded-2xl border border-white/15 text-base font-bold text-white shadow-lg transition hover:scale-[1.03] active:scale-95"
              style={{ background: COLOR_HEX[color] }}
            >
              <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                {COLOR_NAME[color]}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-xl border border-white/10 py-2 text-sm text-white/60 transition hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

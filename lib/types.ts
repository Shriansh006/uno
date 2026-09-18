export const COLORS = ["red", "yellow", "green", "blue"] as const;

export type Color = (typeof COLORS)[number];

export type CardColor = Color | "wild";

export type CardValue =
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "skip"
  | "reverse"
  | "draw2"
  | "wild"
  | "wild4";

export interface Card {
  id: string;
  color: CardColor;
  value: CardValue;
}

export type Phase = "lobby" | "playing" | "roundEnd" | "gameEnd";

export type TurnStage = "choose" | "drawn";

export interface Player {
  id: string;
  name: string;
  isBot: boolean;
  hand: Card[];
  score: number;
  lastSeen: number;
}

export type LogKind = "info" | "play" | "draw" | "uno" | "win" | "error";

export interface LogEntry {
  id: string;
  text: string;
  at: number;
  kind: LogKind;
}

export interface GameState {
  code: string;
  hostId: string;
  phase: Phase;
  players: Player[];
  deck: Card[];
  discard: Card[];
  currentColor: Color;
  turn: number;
  direction: 1 | -1;
  turnStage: TurnStage;
  drawnCardId?: string;
  unoSafe: Record<string, boolean>;
  winnerId?: string;
  round: number;
  log: LogEntry[];
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface PublicPlayer {
  id: string;
  name: string;
  isBot: boolean;
  handCount: number;
  score: number;
  connected: boolean;
  isTurn: boolean;
  vulnerable: boolean;
}

export interface ScoreRow {
  id: string;
  name: string;
  score: number;
  isBot: boolean;
}

export interface PublicState {
  code: string;
  hostId: string;
  phase: Phase;
  you: string | null;
  players: PublicPlayer[];
  topCard: Card | null;
  currentColor: Color;
  deckCount: number;
  turnPlayerId: string | null;
  turnStage: TurnStage;
  direction: 1 | -1;
  drawnCard: Card | null;
  hand: Card[];
  playableIds: string[];
  canDraw: boolean;
  canPass: boolean;
  mustCallUno: boolean;
  canStartRound: boolean;
  winnerId?: string;
  round: number;
  scores: ScoreRow[];
  log: LogEntry[];
  updatedAt: number;
  version: number;
}

export type Action =
  | { type: "start" }
  | { type: "addBot" }
  | { type: "removeBot"; targetId: string }
  | { type: "play"; cardId: string; color?: Color }
  | { type: "draw" }
  | { type: "pass" }
  | { type: "uno" }
  | { type: "catch"; targetId: string }
  | { type: "nextRound" }
  | { type: "newGame" }
  | { type: "kick"; targetId: string }
  | { type: "leave" };

export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;
export const UNO_PENALTY = 2;
export const TARGET_SCORE = 500;
export const BOT_DELAY_MS = 900;
export const CONNECTED_WINDOW_MS = 15000;
export const DISCONNECT_GRACE_MS = 20000;

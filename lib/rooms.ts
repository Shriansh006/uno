import { Redis } from "@upstash/redis";
import type { GameState } from "./types";
import { needsAutomation, runAutomation } from "./engine";

const REDIS_URL =
  process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? "";
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "";

const redis =
  REDIS_URL && REDIS_TOKEN ? new Redis({ url: REDIS_URL, token: REDIS_TOKEN }) : null;

export const usingRedis = Boolean(redis);

const TTL_SECONDS = 60 * 60 * 12;
const TOUCH_INTERVAL_MS = 5000;

interface Memory {
  rooms: Map<string, GameState>;
  chain: Map<string, Promise<unknown>>;
}

const globalStore = globalThis as unknown as { __unoMemory?: Memory };
const memory: Memory =
  globalStore.__unoMemory ??
  (globalStore.__unoMemory = { rooms: new Map(), chain: new Map() });

const roomKey = (code: string) => `uno:room:${code.toUpperCase()}`;
const lockKey = (code: string) => `uno:lock:${code.toUpperCase()}`;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function readRoom(code: string): Promise<GameState | null> {
  const key = code.toUpperCase();
  if (redis) {
    const data = await redis.get<GameState>(roomKey(key));
    return data ?? null;
  }
  return memory.rooms.get(key) ?? null;
}

async function writeRoom(state: GameState): Promise<void> {
  if (redis) {
    await redis.set(roomKey(state.code), state, { ex: TTL_SECONDS });
    return;
  }
  memory.rooms.set(state.code.toUpperCase(), state);
}

async function withRoomLock<T>(code: string, fn: () => Promise<T>): Promise<T> {
  const key = code.toUpperCase();
  if (redis) {
    const nonce = crypto.randomUUID();
    for (let attempt = 0; attempt < 50; attempt++) {
      const acquired = await redis.set(lockKey(key), nonce, { nx: true, px: 5000 });
      if (acquired === "OK") {
        try {
          return await fn();
        } finally {
          const current = await redis.get<string>(lockKey(key));
          if (current === nonce) await redis.del(lockKey(key));
        }
      }
      await sleep(30 + Math.random() * 40);
    }
    throw new Error("The room is busy. Try again in a moment.");
  }

  const previous = memory.chain.get(key) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  memory.chain.set(
    key,
    previous.then(() => gate),
  );
  await previous;
  try {
    return await fn();
  } finally {
    release();
  }
}

export async function mutateRoom<T>(
  code: string,
  mutator: (state: GameState) => T | Promise<T>,
): Promise<{ state: GameState; result: T } | null> {
  return withRoomLock(code, async () => {
    const state = await readRoom(code);
    if (!state) return null;
    const result = await mutator(state);
    state.version = (state.version ?? 0) + 1;
    state.updatedAt = Date.now();
    await writeRoom(state);
    return { state, result };
  });
}

/**
 * Read the room, and only write when something actually changed:
 * a player checked in, or a bot needs to move. Keeps polling cheap.
 */
export async function pollRoom(
  code: string,
  playerId: string | null,
): Promise<GameState | null> {
  const state = await readRoom(code);
  if (!state) return null;

  const now = Date.now();
  const me = playerId ? state.players.find((p) => p.id === playerId) : undefined;
  const needsTouch = Boolean(me && now - me.lastSeen > TOUCH_INTERVAL_MS);
  const automationDue = needsAutomation(state, now);

  if (!needsTouch && !automationDue) return state;

  const updated = await mutateRoom(code, (room) => {
    const mine = playerId ? room.players.find((p) => p.id === playerId) : undefined;
    if (mine && Date.now() - mine.lastSeen > TOUCH_INTERVAL_MS) {
      mine.lastSeen = Date.now();
    }
    runAutomation(room, Date.now());
  });

  return updated?.state ?? state;
}

export async function createRoomState(state: GameState): Promise<void> {
  await writeRoom(state);
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function randomCode(length = 4): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

export async function uniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomCode(4);
    if (!(await readRoom(code))) return code;
  }
  return randomCode(5);
}

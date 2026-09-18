import type { Action, PublicState } from "./types";

const pidKey = (code: string) => `uno:pid:${code.toUpperCase()}`;
const NAME_KEY = "uno:name";
const RECENT_KEY = "uno:recent";

export interface RecentRoom {
  code: string;
  at: number;
}

export function getStoredName(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(NAME_KEY) ?? "";
}

export function saveName(name: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NAME_KEY, name);
}

export function getPlayerId(code: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(pidKey(code));
}

export function setPlayerId(code: string, id: string) {
  window.localStorage.setItem(pidKey(code), id);
}

export function forgetPlayerId(code: string) {
  window.localStorage.removeItem(pidKey(code));
}

export function getRecentRooms(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as RecentRoom[]) : [];
    return list.filter((r) => r && typeof r.code === "string").slice(0, 6);
  } catch {
    return [];
  }
}

export function addRecentRoom(code: string) {
  if (typeof window === "undefined") return;
  const upper = code.toUpperCase();
  const list = getRecentRooms().filter((r) => r.code !== upper);
  list.unshift({ code: upper, at: Date.now() });
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
}

export interface ApiError {
  error: string;
  status?: number;
}

async function parse<T>(res: Response): Promise<T | ApiError> {
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    return { error: message, status: res.status };
  }
  return data as T;
}

export function isError(value: unknown): value is ApiError {
  return Boolean(value && typeof value === "object" && "error" in value);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      return true;
    } catch {
      return false;
    }
  }
}

export async function createRoom(
  name: string,
  opts: { bots?: number; start?: boolean } = {},
): Promise<{ code: string; playerId: string; state: PublicState } | ApiError> {
  const res = await fetch("/api/room", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, ...opts }),
  });
  return parse(res);
}

export async function joinRoom(
  code: string,
  name: string,
  playerId?: string,
): Promise<{ playerId: string; state: PublicState } | ApiError> {
  const res = await fetch(`/api/room/${code.toUpperCase()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, playerId }),
  });
  return parse(res);
}

export async function fetchState(
  code: string,
  playerId: string | null,
): Promise<{ state: PublicState } | ApiError> {
  const query = playerId ? `?p=${encodeURIComponent(playerId)}` : "";
  const res = await fetch(`/api/room/${code.toUpperCase()}${query}`, {
    cache: "no-store",
  });
  return parse(res);
}

export async function sendAction(
  code: string,
  playerId: string,
  action: Action,
): Promise<{ state: PublicState } | ApiError> {
  const res = await fetch(`/api/room/${code.toUpperCase()}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playerId, action }),
  });
  return parse(res);
}

import { addBot, createRoom, publicState, startGame, uid } from "@/lib/engine";
import { asString, jsonError, readBody } from "@/lib/http";
import { createRoomState, uniqueRoomCode } from "@/lib/rooms";
import { MAX_PLAYERS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await readBody(req);
    const name = asString(body.name, "Player").trim().slice(0, 16) || "Player";
    const playerId = asString(body.playerId).trim() || uid();
    const bots = Math.max(
      0,
      Math.min(MAX_PLAYERS - 1, Math.floor(Number(body.bots) || 0)),
    );
    const shouldStart = Boolean(body.start) && bots > 0;

    const code = await uniqueRoomCode();
    const state = createRoom(code, { id: playerId, name });
    for (let i = 0; i < bots; i++) addBot(state);
    if (shouldStart) startGame(state, playerId);

    await createRoomState(state);
    return Response.json({ code, playerId, state: publicState(state, playerId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the room.";
    return jsonError(message, 500);
  }
}

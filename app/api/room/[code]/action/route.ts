import { GameError, applyAction, publicState } from "@/lib/engine";
import { asString, jsonError, readBody } from "@/lib/http";
import { mutateRoom } from "@/lib/rooms";
import type { Action } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const body = await readBody(req);
  const playerId = asString(body.playerId).trim();
  const action = body.action as Action | undefined;

  if (!playerId) return jsonError("Missing player.", 400);
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    return jsonError("Missing action.", 400);
  }

  try {
    const result = await mutateRoom(code, (state) => {
      if (!state.players.some((p) => p.id === playerId)) {
        throw new GameError("You are not in this room.");
      }
      applyAction(state, playerId, action);
    });
    if (!result) return jsonError("That room does not exist.", 404);
    return Response.json({ state: publicState(result.state, playerId) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "That move did not work.";
    return jsonError(message, 400);
  }
}

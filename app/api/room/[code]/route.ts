import { addPlayer, publicState, uid } from "@/lib/engine";
import { asString, jsonError, readBody } from "@/lib/http";
import { mutateRoom, pollRoom } from "@/lib/rooms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ code: string }> };

export async function GET(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const playerId = new URL(req.url).searchParams.get("p");
  const state = await pollRoom(code, playerId);
  if (!state) return jsonError("That room does not exist.", 404);
  return Response.json({ state: publicState(state, playerId) });
}

export async function POST(req: Request, ctx: Ctx) {
  const { code } = await ctx.params;
  const body = await readBody(req);
  const name = asString(body.name, "Player").trim().slice(0, 16) || "Player";
  const playerId = asString(body.playerId).trim() || uid();

  try {
    const result = await mutateRoom(code, (state) => {
      const existing = state.players.find((p) => p.id === playerId);
      if (existing) {
        existing.lastSeen = Date.now();
        return existing;
      }
      return addPlayer(state, { id: playerId, name });
    });
    if (!result) return jsonError("That room does not exist.", 404);
    return Response.json({
      playerId,
      state: publicState(result.state, playerId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join.";
    return jsonError(message, 400);
  }
}

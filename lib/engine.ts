import {
  BOT_DELAY_MS,
  COLORS,
  CONNECTED_WINDOW_MS,
  DISCONNECT_GRACE_MS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  TARGET_SCORE,
  UNO_PENALTY,
  type Action,
  type Card,
  type CardValue,
  type Color,
  type GameState,
  type LogEntry,
  type LogKind,
  type Player,
  type PublicState,
} from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export class GameError extends Error {}

function log(state: GameState, text: string, kind: LogKind = "info") {
  const entry: LogEntry = { id: uid(), text, at: Date.now(), kind };
  state.log.push(entry);
  if (state.log.length > 60) state.log.splice(0, state.log.length - 60);
}

/* ------------------------------- deck ---------------------------------- */

function repeat(card: Card, times: number): Card[] {
  return Array.from({ length: times }, () => ({ ...card, id: uid() }));
}

export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const color of COLORS) {
    deck.push({ id: uid(), color, value: "0" });
    for (let n = 1; n <= 9; n++) {
      const value = String(n) as CardValue;
      deck.push(...repeat({ id: "", color, value }, 2));
    }
    for (const value of ["skip", "reverse", "draw2"] as CardValue[]) {
      deck.push(...repeat({ id: "", color, value }, 2));
    }
  }
  for (let i = 0; i < 4; i++) {
    deck.push({ id: uid(), color: "wild", value: "wild" });
    deck.push({ id: uid(), color: "wild", value: "wild4" });
  }
  return deck;
}

export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function cardPoints(value: CardValue): number {
  if (value === "wild" || value === "wild4") return 50;
  if (value === "skip" || value === "reverse" || value === "draw2") return 20;
  return Number(value);
}

export function topCard(state: GameState): Card | null {
  return state.discard.length ? state.discard[state.discard.length - 1] : null;
}

function isNumberCard(card: Card): boolean {
  if (card.color === "wild") return false;
  const value = Number(card.value);
  return Number.isInteger(value) && value >= 0 && value <= 9;
}

export function canPlayCard(state: GameState, card: Card): boolean {
  if (card.color === "wild") return true;
  if (card.color === state.currentColor) return true;
  const top = topCard(state);
  if (top && top.color !== "wild" && top.value === card.value) return true;
  return false;
}

/* ------------------------------ lifecycle ------------------------------ */

export function createRoom(
  code: string,
  host: { id: string; name: string },
): GameState {
  const now = Date.now();
  const state: GameState = {
    code,
    hostId: host.id,
    phase: "lobby",
    players: [
      {
        id: host.id,
        name: host.name,
        isBot: false,
        hand: [],
        score: 0,
        lastSeen: now,
      },
    ],
    deck: [],
    discard: [],
    currentColor: "red",
    turn: 0,
    direction: 1,
    turnStage: "choose",
    unoSafe: {},
    round: 0,
    log: [],
    createdAt: now,
    updatedAt: now,
    version: 0,
  };
  log(state, `${host.name} opened the room`, "info");
  return state;
}

function uniqueName(state: GameState, name: string): string {
  const clean = name.trim().slice(0, 16) || "Player";
  const taken = new Set(state.players.map((p) => p.name.toLowerCase()));
  if (!taken.has(clean.toLowerCase())) return clean;
  for (let i = 2; i < 50; i++) {
    const candidate = `${clean} ${i}`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${clean} ${uid().slice(0, 4)}`;
}

export function addPlayer(
  state: GameState,
  input: { id: string; name: string; isBot?: boolean },
): Player {
  if (state.phase !== "lobby") {
    throw new GameError("The game has already started.");
  }
  if (state.players.length >= MAX_PLAYERS) {
    throw new GameError("This room is full.");
  }
  const name = uniqueName(state, input.name);
  const player: Player = {
    id: input.id,
    name,
    isBot: Boolean(input.isBot),
    hand: [],
    score: 0,
    lastSeen: Date.now(),
  };
  state.players.push(player);
  log(state, input.isBot ? `${name} (bot) joined` : `${name} joined`, "info");
  return player;
}

export const BOT_NAMES = [
  "Nova",
  "Rocket",
  "Pixel",
  "Cosmo",
  "Juno",
  "Bolt",
  "Echo",
  "Ziggy",
];

export function addBot(state: GameState): Player {
  const used = new Set(state.players.map((p) => p.name));
  const name = BOT_NAMES.find((n) => !used.has(n)) ?? `Bot ${state.players.length}`;
  return addPlayer(state, { id: `bot_${uid()}`, name, isBot: true });
}

export function removePlayer(state: GameState, id: string) {
  const idx = state.players.findIndex((p) => p.id === id);
  if (idx === -1) return;
  const [gone] = state.players.splice(idx, 1);
  delete state.unoSafe[id];
  log(state, `${gone.name} left`, "info");
  if (state.turn >= state.players.length) state.turn = 0;
  if (state.players.length && !state.players.some((p) => p.id === state.hostId)) {
    const nextHuman = state.players.find((p) => !p.isBot) ?? state.players[0];
    state.hostId = nextHuman.id;
  }
}

export function leaveRoom(state: GameState, id: string) {
  const player = state.players.find((p) => p.id === id);
  if (!player) return;
  if (state.phase === "lobby") {
    removePlayer(state, id);
    return;
  }
  if (state.phase === "playing" || state.phase === "roundEnd") {
    if (player.isBot) {
      removePlayer(state, id);
      return;
    }
    player.isBot = true;
    player.name = `${player.name} (bot)`;
    player.lastSeen = Date.now();
    log(state, `${player.name} left — a bot took over`, "info");
    const hasHumans = state.players.some((p) => !p.isBot);
    if (!hasHumans) {
      state.phase = "roundEnd";
      state.winnerId = state.players[state.turn]?.id;
      log(state, "Everyone left. Table closed.", "info");
    }
  }
}

/* -------------------------------- dealing ------------------------------ */

function ensureDeck(state: GameState) {
  if (state.deck.length) return;
  if (state.discard.length <= 1) return;
  const top = state.discard[state.discard.length - 1];
  const rest = state.discard.slice(0, -1);
  state.discard = [top];
  state.deck = shuffle(rest);
  log(state, "Reshuffled the discard pile", "info");
}

function drawCards(state: GameState, count: number): Card[] {
  const drawn: Card[] = [];
  for (let i = 0; i < count; i++) {
    ensureDeck(state);
    const card = state.deck.pop();
    if (!card) break;
    drawn.push(card);
  }
  return drawn;
}

function dealRound(state: GameState) {
  const previousWinnerId = state.winnerId;
  state.deck = shuffle(buildDeck());
  state.discard = [];
  state.turnStage = "choose";
  state.drawnCardId = undefined;
  state.unoSafe = {};
  state.direction = 1;
  state.winnerId = undefined;

  for (const player of state.players) {
    player.hand = drawCards(state, 7);
  }

  let starter: Card;
  const starterIndex = state.deck.findIndex(isNumberCard);
  if (starterIndex === -1) {
    starter = { id: uid(), color: "red", value: "0" };
  } else {
    starter = state.deck[starterIndex];
    state.deck.splice(starterIndex, 1);
  }
  state.discard = [starter];
  state.currentColor = starter.color === "wild" ? "red" : starter.color;

  const previousTurn = state.players.findIndex((p) => p.id === previousWinnerId);
  state.turn = previousTurn === -1 ? 0 : (previousTurn + 1) % state.players.length;
  state.round += 1;

  log(
    state,
    `Round ${state.round} started — ${state.players[state.turn].name} goes first`,
    "info",
  );
}

export function startGame(state: GameState, byId: string) {
  if (state.phase !== "lobby") throw new GameError("The game is already running.");
  if (byId !== state.hostId) throw new GameError("Only the host can start.");
  if (state.players.length < MIN_PLAYERS) {
    throw new GameError(`You need at least ${MIN_PLAYERS} players.`);
  }
  state.phase = "playing";
  dealRound(state);
}

export function nextRound(state: GameState, byId: string) {
  if (state.phase !== "roundEnd") throw new GameError("No round to start.");
  if (byId !== state.hostId) throw new GameError("Only the host can deal.");
  state.phase = "playing";
  dealRound(state);
}

export function newGame(state: GameState, byId: string) {
  if (byId !== state.hostId) throw new GameError("Only the host can reset.");
  for (const player of state.players) player.score = 0;
  state.round = 0;
  state.phase = "playing";
  dealRound(state);
  log(state, "New game — scores reset", "info");
}

/* -------------------------------- turns -------------------------------- */

function nextTurnIndex(state: GameState, steps: number): number {
  const n = state.players.length;
  if (!n) return 0;
  return (((state.turn + state.direction * steps) % n) + n) % n;
}

function advanceTurn(state: GameState, steps: number) {
  state.turn = nextTurnIndex(state, steps);
  state.turnStage = "choose";
  state.drawnCardId = undefined;
  const current = state.players[state.turn];
  if (current && current.hand.length === 1 && !state.unoSafe[current.id]) {
    state.unoSafe[current.id] = true;
  }
}

function requireTurn(state: GameState, playerId: string): Player {
  if (state.phase !== "playing") throw new GameError("The game is not running.");
  const player = state.players[state.turn];
  if (!player || player.id !== playerId) throw new GameError("It is not your turn.");
  return player;
}

function drawForPlayer(state: GameState, player: Player, count: number): Card[] {
  const cards = drawCards(state, count);
  player.hand.push(...cards);
  if (cards.length === 1) {
    log(state, `${player.name} drew a card`, "draw");
  } else if (cards.length > 1) {
    log(state, `${player.name} drew ${cards.length} cards`, "draw");
  }
  return cards;
}

export function drawCard(state: GameState, playerId: string) {
  const player = requireTurn(state, playerId);
  if (state.turnStage === "drawn") {
    throw new GameError("You already drew. Play it or pass.");
  }
  const [card] = drawCards(state, 1);
  if (!card) {
    log(state, "Deck is empty — passing", "info");
    advanceTurn(state, 1);
    return;
  }
  player.hand.push(card);
  if (canPlayCard(state, card)) {
    state.turnStage = "drawn";
    state.drawnCardId = card.id;
    log(state, `${player.name} drew a card — play it or pass`, "draw");
  } else {
    log(state, `${player.name} drew a card`, "draw");
    advanceTurn(state, 1);
  }
}

export function passTurn(state: GameState, playerId: string) {
  const player = requireTurn(state, playerId);
  if (state.turnStage !== "drawn") throw new GameError("You must draw first.");
  log(state, `${player.name} passed`, "info");
  advanceTurn(state, 1);
}

function finishRound(state: GameState, winner: Player) {
  let points = 0;
  for (const player of state.players) {
    if (player.id === winner.id) continue;
    points += player.hand.reduce((sum, card) => sum + cardPoints(card.value), 0);
  }
  winner.score += points;
  state.winnerId = winner.id;
  state.unoSafe[winner.id] = true;
  if (winner.score >= TARGET_SCORE) {
    state.phase = "gameEnd";
    log(state, `${winner.name} wins the game with ${winner.score} points!`, "win");
  } else {
    state.phase = "roundEnd";
    log(state, `${winner.name} won round ${state.round} (+${points})`, "win");
  }
}

export function playCard(
  state: GameState,
  playerId: string,
  cardId: string,
  chosenColor?: Color,
) {
  const player = requireTurn(state, playerId);
  if (state.turnStage === "drawn" && state.drawnCardId && cardId !== state.drawnCardId) {
    throw new GameError("You can only play the card you drew.");
  }
  const card = player.hand.find((c) => c.id === cardId);
  if (!card) throw new GameError("That card is not in your hand.");
  if (!canPlayCard(state, card)) throw new GameError("You cannot play that card.");

  let color: Color | undefined;
  if (card.color === "wild") {
    const valid = chosenColor && COLORS.includes(chosenColor);
    if (!valid) throw new GameError("Pick a color for the wild card.");
    color = chosenColor;
  }

  player.hand = player.hand.filter((c) => c.id !== cardId);
  state.discard.push(card);
  if (color) state.currentColor = color;
  log(state, `${player.name} played ${describeCard(card)}`, "play");

  if (player.hand.length === 0) {
    finishRound(state, player);
    return;
  }
  if (player.hand.length === 1) {
    state.unoSafe[player.id] = false;
    log(state, `${player.name} is down to one card!`, "uno");
  }

  state.turnStage = "choose";
  state.drawnCardId = undefined;

  switch (card.value) {
    case "skip": {
      const victim = state.players[nextTurnIndex(state, 1)];
      log(state, `${victim?.name ?? "Next player"} was skipped`, "info");
      advanceTurn(state, 2);
      break;
    }
    case "reverse": {
      if (state.players.length === 2) {
        advanceTurn(state, 2);
      } else {
        state.direction = state.direction === 1 ? -1 : 1;
        log(state, "Direction reversed", "info");
        advanceTurn(state, 1);
      }
      break;
    }
    case "draw2": {
      const victim = state.players[nextTurnIndex(state, 1)];
      if (victim) drawForPlayer(state, victim, 2);
      advanceTurn(state, 2);
      break;
    }
    case "wild4": {
      const victim = state.players[nextTurnIndex(state, 1)];
      if (victim) drawForPlayer(state, victim, 4);
      advanceTurn(state, 2);
      break;
    }
    default:
      advanceTurn(state, 1);
  }
}

export function callUno(state: GameState, playerId: string) {
  const player = state.players.find((p) => p.id === playerId);
  if (!player || player.hand.length !== 1) {
    throw new GameError("You do not have one card.");
  }
  if (state.unoSafe[playerId]) return;
  state.unoSafe[playerId] = true;
  log(state, `${player.name} called UNO!`, "uno");
}

export function catchUno(state: GameState, byId: string, targetId: string) {
  const target = state.players.find((p) => p.id === targetId);
  const by = state.players.find((p) => p.id === byId);
  if (!target || !by) throw new GameError("Player not found.");
  if (target.hand.length !== 1 || state.unoSafe[target.id]) {
    throw new GameError("They are safe for now.");
  }
  state.unoSafe[target.id] = true;
  drawForPlayer(state, target, UNO_PENALTY);
  log(state, `${by.name} caught ${target.name} not saying UNO (+${UNO_PENALTY})`, "uno");
}

/* --------------------------------- bots -------------------------------- */

function mostCommonColor(player: Player): Color {
  const counts: Record<Color, number> = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const card of player.hand) {
    if (card.color !== "wild") counts[card.color] += 1;
  }
  let best: Color = COLORS[Math.floor(Math.random() * COLORS.length)];
  let bestCount = -1;
  for (const color of COLORS) {
    if (counts[color] > bestCount) {
      bestCount = counts[color];
      best = color;
    }
  }
  return best;
}

function chooseBotCard(state: GameState, player: Player): Card | null {
  const playable = player.hand.filter((card) => canPlayCard(state, card));
  if (!playable.length) return null;
  const nextIndex = nextTurnIndex(state, 1);
  const next = state.players[nextIndex];
  const nextIsDanger = next ? next.hand.length <= 2 : false;

  const score = (card: Card): number => {
    let value = 0;
    if (card.color !== "wild") value += 5;
    if (nextIsDanger && (card.value === "skip" || card.value === "reverse" || card.value === "draw2")) {
      value += 4;
    }
    if (card.value === "wild4") value += 1;
    if (card.value === "wild") value += 0.5;
    if (card.color !== "wild" && card.color === state.currentColor) value += 2;
    return value + Math.random();
  };

  return [...playable].sort((a, b) => score(b) - score(a))[0];
}

function botAct(state: GameState, player: Player) {
  const pick = chooseBotCard(state, player);
  if (pick) {
    const color = pick.color === "wild" ? mostCommonColor(player) : undefined;
    playCard(state, player.id, pick.id, color);
    if (player.hand.length === 1 && Math.random() > 0.2) {
      callUno(state, player.id);
    }
    return;
  }
  drawCard(state, player.id);
  if (state.phase !== "playing") return;
  if (state.players[state.turn]?.id !== player.id) return;
  if (state.turnStage === "drawn" && state.drawnCardId) {
    const drawn = player.hand.find((c) => c.id === state.drawnCardId);
    if (drawn && canPlayCard(state, drawn)) {
      const color = drawn.color === "wild" ? mostCommonColor(player) : undefined;
      playCard(state, player.id, drawn.id, color);
    } else {
      passTurn(state, player.id);
    }
  }
}

export function needsAutomation(state: GameState, now = Date.now()): boolean {
  if (state.phase !== "playing") return false;
  if (now - state.updatedAt < BOT_DELAY_MS) return false;
  const player = state.players[state.turn];
  if (!player) return false;
  return player.isBot || now - player.lastSeen > DISCONNECT_GRACE_MS;
}

export function runAutomation(state: GameState, now = Date.now()): boolean {
  if (!needsAutomation(state, now)) return false;
  const player = state.players[state.turn];
  if (!player) return false;
  try {
    botAct(state, player);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    log(state, `${player.name} got stuck (${message})`, "error");
    try {
      advanceTurn(state, 1);
    } catch {
      /* ignore */
    }
  }
  state.updatedAt = Date.now();
  state.version += 1;
  return true;
}

/* ------------------------------- actions -------------------------------- */

export function applyAction(state: GameState, playerId: string, action: Action) {
  switch (action.type) {
    case "start":
      startGame(state, playerId);
      break;
    case "addBot": {
      if (playerId !== state.hostId) throw new GameError("Only the host can add bots.");
      addBot(state);
      break;
    }
    case "removeBot": {
      if (playerId !== state.hostId) throw new GameError("Only the host can remove bots.");
      const bot = state.players.find((p) => p.id === action.targetId);
      if (!bot || !bot.isBot) throw new GameError("That is not a bot.");
      removePlayer(state, action.targetId);
      break;
    }
    case "kick": {
      if (playerId !== state.hostId) throw new GameError("Only the host can remove players.");
      if (action.targetId === state.hostId) throw new GameError("You cannot remove yourself.");
      removePlayer(state, action.targetId);
      break;
    }
    case "play":
      playCard(state, playerId, action.cardId, action.color);
      break;
    case "draw":
      drawCard(state, playerId);
      break;
    case "pass":
      passTurn(state, playerId);
      break;
    case "uno":
      callUno(state, playerId);
      break;
    case "catch":
      catchUno(state, playerId, action.targetId);
      break;
    case "nextRound":
      nextRound(state, playerId);
      break;
    case "newGame":
      newGame(state, playerId);
      break;
    case "leave":
      leaveRoom(state, playerId);
      break;
    default:
      throw new GameError("Unknown action.");
  }
}

/* ------------------------------ view model ------------------------------ */

export function describeCard(card: Card): string {
  const colorName = card.color === "wild" ? "" : `${card.color} `;
  switch (card.value) {
    case "skip":
      return `${colorName}Skip`;
    case "reverse":
      return `${colorName}Reverse`;
    case "draw2":
      return `${colorName}+2`;
    case "wild":
      return "Wild";
    case "wild4":
      return "Wild +4";
    default:
      return `${colorName}${card.value}`.trim();
  }
}

export function playableIdsFor(state: GameState, playerId: string): string[] {
  if (state.phase !== "playing") return [];
  const current = state.players[state.turn];
  const player = state.players.find((p) => p.id === playerId);
  if (!player || !current || current.id !== playerId) return [];
  if (state.turnStage === "drawn") {
    const drawn = player.hand.find((c) => c.id === state.drawnCardId);
    return drawn && canPlayCard(state, drawn) ? [drawn.id] : [];
  }
  return player.hand.filter((c) => canPlayCard(state, c)).map((c) => c.id);
}

export function publicState(state: GameState, playerId: string | null): PublicState {
  const now = Date.now();
  const me = playerId ? state.players.find((p) => p.id === playerId) : undefined;
  const turnPlayer = state.players[state.turn];
  const isMyTurn = Boolean(me && turnPlayer && turnPlayer.id === me.id);

  const players = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    isBot: p.isBot,
    handCount: p.hand.length,
    score: p.score,
    connected: p.isBot || now - p.lastSeen < CONNECTED_WINDOW_MS,
    isTurn: turnPlayer?.id === p.id,
    vulnerable: state.phase === "playing" && p.hand.length === 1 && !state.unoSafe[p.id],
  }));

  const drawnCard =
    me && isMyTurn && state.turnStage === "drawn" && state.drawnCardId
      ? me.hand.find((c) => c.id === state.drawnCardId) ?? null
      : null;

  return {
    code: state.code,
    hostId: state.hostId,
    phase: state.phase,
    you: me?.id ?? null,
    players,
    topCard: topCard(state),
    currentColor: state.currentColor,
    deckCount: state.deck.length,
    turnPlayerId: turnPlayer?.id ?? null,
    turnStage: state.turnStage,
    direction: state.direction,
    drawnCard,
    hand: me?.hand ?? [],
    playableIds: me ? playableIdsFor(state, me.id) : [],
    canDraw: Boolean(me && isMyTurn && state.turnStage === "choose" && state.phase === "playing"),
    canPass: Boolean(me && isMyTurn && state.turnStage === "drawn" && state.phase === "playing"),
    mustCallUno: Boolean(
      me && state.phase === "playing" && me.hand.length === 1 && !state.unoSafe[me.id],
    ),
    canStartRound: state.phase === "roundEnd" || state.phase === "gameEnd",
    winnerId: state.winnerId,
    round: state.round,
    scores: [...state.players]
      .sort((a, b) => b.score - a.score)
      .map((p) => ({ id: p.id, name: p.name, score: p.score, isBot: p.isBot })),
    log: state.log,
    updatedAt: state.updatedAt,
    version: state.version,
  };
}

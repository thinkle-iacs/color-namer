import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Color, GameDoc, GameStatus, PlayerInfo, RoundResult } from './types';

// ── Player identity ────────────────────────────────────────────────────────────

const PLAYER_ID_KEY = 'crayonNamer_playerId';

export function getOrCreatePlayerId(): string {
  let id = localStorage.getItem(PLAYER_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
  }
  return id;
}

// Deterministic avatar color based on join order
export function avatarColor(order: number): string {
  const hue = Math.round((order * 137.508) % 360);
  return `hsl(${hue}, 70%, 50%)`;
}

// ── Color distance ─────────────────────────────────────────────────────────────

export function colorDistance(c1: Color, c2: Color): number {
  const dl = c1.lightness - c2.lightness;
  const da = c1.a - c2.a;
  const db = c1.b - c2.b;
  return Math.sqrt(dl * dl + da * da + db * db);
}

// ── Scoring ────────────────────────────────────────────────────────────────────

// Guesser score: 100 at distance 0, 0 at distance ~67
export function guesserScore(distance: number): number {
  return Math.max(0, Math.round(100 - distance * 1.5));
}

// Picker score: average of all guesser scores, halved
// (picker is rewarded for clues guessable but not trivial)
export function pickerScore(guesserScores: number[]): number {
  if (guesserScores.length === 0) return 0;
  const avg = guesserScores.reduce((s, v) => s + v, 0) / guesserScores.length;
  return Math.round(avg / 2);
}

export function computeResults(game: GameDoc): RoundResult[] {
  if (!game.roundTarget) return [];
  const results: RoundResult[] = [];
  for (const playerId of game.playerOrder) {
    const guess = game.roundGuesses[playerId];
    if (!guess) continue;
    const player = game.players[playerId];
    const dist = colorDistance(guess, game.roundTarget);
    results.push({
      playerId,
      name: player.name,
      avatarColor: player.avatarColor,
      guessedColor: guess,
      distance: dist,
      pointsEarned: guesserScore(dist),
    });
  }
  return results.sort((a, b) => a.distance - b.distance);
}

// ── Firestore operations ───────────────────────────────────────────────────────

export async function createGame(playerId: string, playerName: string): Promise<string> {
  const gameId = crypto.randomUUID().slice(0, 8).toUpperCase();
  const playerInfo: PlayerInfo = {
    name: playerName,
    score: 0,
    avatarColor: avatarColor(0),
    order: 0,
  };
  const gameDoc: GameDoc = {
    status: 'lobby',
    hostId: playerId,
    pickerIndex: 0,
    roundNumber: 0,
    createdAt: Date.now(),
    playerOrder: [playerId],
    players: { [playerId]: playerInfo },
    roundClue: null,
    roundGuesses: {},
    roundTarget: null,
  };
  await setDoc(doc(db, 'games', gameId), gameDoc);
  return gameId;
}

export async function joinGame(
  gameId: string,
  playerId: string,
  playerName: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ref = doc(db, 'games', gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return { ok: false, error: 'Game not found' };

  const data = snap.data() as GameDoc;
  if (data.status !== 'lobby') return { ok: false, error: 'Game already started' };

  // Already in game? Just return ok
  if (data.players[playerId]) return { ok: true };

  const order = data.playerOrder.length;
  const playerInfo: PlayerInfo = {
    name: playerName,
    score: 0,
    avatarColor: avatarColor(order),
    order,
  };

  await updateDoc(ref, {
    [`players.${playerId}`]: playerInfo,
    playerOrder: [...data.playerOrder, playerId],
  });

  return { ok: true };
}

export async function startGame(gameId: string): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'picking' as GameStatus,
    pickerIndex: 0,
    roundNumber: 1,
    roundClue: null,
    roundGuesses: {},
    roundTarget: null,
  });
}

// Picker submits their 2-word clue. Color stays in picker's browser until reveal.
export async function submitClue(gameId: string, clue: string): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'guessing' as GameStatus,
    roundClue: clue,
    roundGuesses: {},
    roundTarget: null,
  });
}

// Guesser submits their color pick
export async function submitGuess(gameId: string, playerId: string, color: Color): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    [`roundGuesses.${playerId}`]: color,
  });
}

// Picker reveals the target color — triggers the reveal phase and updates scores
export async function revealTarget(gameId: string, target: Color): Promise<void> {
  const ref = doc(db, 'games', gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as GameDoc;

  // Calculate and apply score deltas
  const results = computeResults({ ...data, roundTarget: target });
  const guessScores = results.map((r) => r.pointsEarned);
  const pickerPts = pickerScore(guessScores);

  const pickerPlayerId = data.playerOrder[data.pickerIndex];
  const scoreUpdates: Record<string, number> = {};

  for (const r of results) {
    const prev = data.players[r.playerId]?.score ?? 0;
    scoreUpdates[`players.${r.playerId}.score`] = prev + r.pointsEarned;
  }
  if (pickerPlayerId) {
    const prev = data.players[pickerPlayerId]?.score ?? 0;
    scoreUpdates[`players.${pickerPlayerId}.score`] = prev + pickerPts;
  }

  await updateDoc(ref, {
    ...scoreUpdates,
    roundTarget: target,
    status: 'reveal' as GameStatus,
  });
}

// Host advances to the next round
export async function nextRound(gameId: string): Promise<void> {
  const ref = doc(db, 'games', gameId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const data = snap.data() as GameDoc;

  const nextPickerIndex = (data.pickerIndex + 1) % data.playerOrder.length;
  await updateDoc(ref, {
    status: 'picking' as GameStatus,
    pickerIndex: nextPickerIndex,
    roundNumber: data.roundNumber + 1,
    roundClue: null,
    roundGuesses: {},
    roundTarget: null,
  });
}

// Real-time listener — returns unsubscribe function
export function subscribeToGame(gameId: string, onUpdate: (game: GameDoc) => void): () => void {
  return onSnapshot(doc(db, 'games', gameId), (snap) => {
    if (snap.exists()) {
      onUpdate(snap.data() as GameDoc);
    }
  });
}

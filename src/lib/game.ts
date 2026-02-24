import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Color, Difficulty, GameDoc, GameStatus, PlayerInfo, RoundResult } from './types';

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

export const GUESSER_MAX_SCORE = 500;
export const GUESSER_MAX_DISTANCE = 55;
const SCORE_CURVE_MIDPOINT = 17;
const SCORE_CURVE_STEEPNESS = 5.5;

function sigmoid(distance: number): number {
  return 1 / (1 + Math.exp((distance - SCORE_CURVE_MIDPOINT) / SCORE_CURVE_STEEPNESS));
}

// Smooth S-curve score:
// - near-plateau for very close guesses
// - steeper middle drop
// - soft tail to 0 by GUESSER_MAX_DISTANCE
export function guesserScoreContinuous(distance: number): number {
  if (distance >= GUESSER_MAX_DISTANCE) return 0;
  const top = sigmoid(0);
  const bottom = sigmoid(GUESSER_MAX_DISTANCE);
  const t = (sigmoid(Math.max(0, distance)) - bottom) / (top - bottom);
  const clamped = Math.max(0, Math.min(1, t));
  return GUESSER_MAX_SCORE * clamped;
}

// Inverse lookup for visualization rings (score -> distance)
export function distanceForGuesserScore(points: number): number {
  const target = Math.max(0, Math.min(GUESSER_MAX_SCORE, points));
  if (target >= GUESSER_MAX_SCORE) return 0;
  if (target <= 0) return GUESSER_MAX_DISTANCE;

  let low = 0;
  let high = GUESSER_MAX_DISTANCE;
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2;
    const score = guesserScoreContinuous(mid);
    if (score > target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

// Rounded displayed score used in scoring
export function guesserScore(distance: number): number {
  return Math.round(guesserScoreContinuous(distance));
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
    difficulty: 'easy',
    pickerIndex: 0,
    roundNumber: 0,
    createdAt: Date.now(),
    playerOrder: [playerId],
    players: { [playerId]: playerInfo },
    roundSeed: null,
    roundClue: null,
    roundGuesses: {},
    roundPickedColor: null,
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

export async function startGame(gameId: string, difficulty: Difficulty): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'picking' as GameStatus,
    difficulty,
    pickerIndex: 0,
    roundNumber: 1,
    roundSeed: Math.floor(Math.random() * 2 ** 31),
    roundClue: null,
    roundGuesses: {},
    roundPickedColor: null,
    roundTarget: null,
  });
}

// Picker's chosen target color (persist immediately so refreshes are safe)
export async function savePickedColor(gameId: string, color: Color): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    roundPickedColor: color,
  });
}

// Picker submits their 2-word clue.
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
  if (data.status === 'reveal') return;

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
    roundSeed: Math.floor(Math.random() * 2 ** 31),
    roundClue: null,
    roundGuesses: {},
    roundPickedColor: null,
    roundTarget: null,
  });
}

// Host can switch difficulty between rounds / phases.
// UI should prevent changing during active picking to avoid disrupting the picker.
export async function setDifficulty(gameId: string, difficulty: Difficulty): Promise<void> {
  await updateDoc(doc(db, 'games', gameId), {
    difficulty,
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

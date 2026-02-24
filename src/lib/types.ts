// LAB color (matches existing ColorPicker internal format)
export type Color = {
  lightness: number; // L* 0–100
  a: number;         // a* -128 to 128
  b: number;         // b* -128 to 128
};

export type GameStatus = 'lobby' | 'picking' | 'guessing' | 'reveal';

export type PlayerInfo = {
  name: string;
  score: number;
  avatarColor: string; // css hsl() string for the player dot
  order: number;       // join order (0-based), used for picker rotation
};

// The Firestore document stored at games/{gameId}
export type GameDoc = {
  status: GameStatus;
  hostId: string;
  pickerIndex: number;           // index into playerOrder
  roundNumber: number;
  createdAt: number;
  playerOrder: string[];         // player IDs in turn order
  players: Record<string, PlayerInfo>;

  // Set when picker submits their clue (picking → guessing)
  roundClue: string | null;

  // Each guesser's submitted color
  roundGuesses: Record<string, Color>;

  // Only set when picker reveals (guessing → reveal)
  roundTarget: Color | null;
};

// Computed round result for one player
export type RoundResult = {
  playerId: string;
  name: string;
  avatarColor: string;
  guessedColor: Color;
  distance: number;
  pointsEarned: number;
};

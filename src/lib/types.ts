// Core Data Types
export type Color = {
  lightness: number;
  a: number;
  b: number;
};

export type Player = {
  id: string;
  name: string;
  color: Color;
  guess: Color | null;
  connected: boolean;
};

export type GameStateType =
  | "WAITING_FOR_PLAYERS"
  | "WAITING_FOR_COLOR"
  | "GUESSING"
  | "REVEAL";

export type GameState = {
  id: string;
  players: Player[];
  currentColor: Color | null;
  clue: string;
  state: GameStateType;
  lastActivity?: number;
  currentPlayerIndex: number;
};

// Client → Server Messages
export type ClientMessage =
  | {
      type: "GET_GAME_STATE";
      gameId: string;
    }
  | {
      type: "JOIN_GAME";
      name: string;
      color: Color;
      gameId?: string;
    }
  | {
      type: "LEAVE_GAME";
      playerId: string;
      gameId: string;
    }
  | {
      type: "START_GAME";
      gameId: string;
    }
  | {
      type: "SET_COLOR";
      color: Color;
      clue?: string;
    }
  | {
      type: "SUBMIT_GUESS";
      color: Color;
    }
  | {
      type: "NEXT_ROUND";
    }
  | {
      type: "RECONNECT";
      playerId: string;
      gameId: string;
      name?: string;
      color?: Color;
    }
  | {
      type: "HEARTBEAT";
    };

// Server → Client Messages
export type ServerMessage =
  | {
      type: "GAME_STATE";
      gameState: GameState;
    }
  | {
      type: "CONNECTED";
      gameId: string;
      playerId: string;
    }
  | {
      type: "RECONNECTED";
      gameId: string;
      playerId: string;
    }
  | {
      type: "GAME_UPDATE";
      gameState: GameState;
    }
  | {
      type: "ERROR";
      message: string;
    }
  | {
      type: "CONFIRMATION";
      messageType: ClientMessage["type"];
      timestamp: number;
    };

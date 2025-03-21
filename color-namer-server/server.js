import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * @typedef {import('../src/lib/types').Color} Color
 * @typedef {import('../src/lib/types').GameState} GameState
 * @typedef {import('../src/lib/types').Player} Player
 * @typedef {import('../src/lib/types').ClientMessage} ClientMessage
 * @typedef {import('../src/lib/types').ServerMessage} ServerMessage
 */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Enable CORS
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// In-memory game storage
/** @type {Map<string, GameState>} */
const games = new Map();

/**
 * Function to clean up inactive games
 */
function cleanupInactiveGames() {
  const now = Date.now();
  for (const [gameId, game] of games.entries()) {
    const allDisconnected = game.players.every(p => !p.connected);
    const inactive = now - (game.lastActivity || 0) > 30 * 60 * 1000; // 30 minutes

    if (allDisconnected && inactive) {
      console.log(`Cleaning up inactive game: ${gameId}`);
      games.delete(gameId);
    }
  }
}

// Run cleanup every 15 minutes
setInterval(cleanupInactiveGames, 15 * 60 * 1000);

/**
 * Create a new game or return an existing one
 * @param {string} [gameId]
 * @returns {GameState}
 */
function createGame(gameId = null) {
  const id = gameId || Math.random().toString(36).substring(2, 8).toUpperCase();

  if (!games.has(id)) {
    games.set(id, {
      id,
      players: [],
      currentColor: null,
      clue: '',
      state: 'WAITING_FOR_PLAYERS',
      currentPlayerIndex: 0,
      lastActivity: Date.now()
    });
  }

  return games.get(id);
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);
  /** @type {string | null} */
  let playerId = null;
  /** @type {string | null} */
  let gameId = null;

  /**
   * Update last activity time for game
   */
  function updateActivity() {
    if (gameId && games.has(gameId)) {
      games.get(gameId).lastActivity = Date.now();
    }
  }

  // Extract gameId from query if present
  if (socket.handshake.query && socket.handshake.query.gameId) {
    gameId = socket.handshake.query.gameId;
    console.log(`Connection requested for game: ${gameId}`);
  }

  /**
   * Handle JOIN_GAME message
   * @param {ClientMessage} data
   */
  socket.on('JOIN_GAME', (data) => {
    gameId = data.gameId || createGame().id;
    playerId = socket.id;

    const game = createGame(gameId);
    updateActivity();

    // Create new player
    /** @type {Player} */
    const player = {
      id: playerId,
      name: data.name,
      color: data.color,
      guess: null,
      connected: true
    };

    // Add player to game
    game.players.push(player);

    // Join socket room for this game
    socket.join(gameId);

    // Send confirmation
    /** @type {ServerMessage} */
    const connectedMessage = { type: 'CONNECTED', gameId, playerId };
    socket.emit('CONNECTED', connectedMessage);

    // Broadcast updated game state
    /** @type {ServerMessage} */
    const gameUpdateMessage = { type: 'GAME_UPDATE', gameState: game };
    io.to(gameId).emit('GAME_UPDATE', gameUpdateMessage);

    console.log(`Player ${data.name} (${playerId}) joined game ${gameId}`);
  });

  // Other handlers for RECONNECT, SET_COLOR, SUBMIT_GUESS, etc.
  // Copy from the complete server.js code in my previous message

  // Handle disconnection
  socket.on('disconnect', () => {
    if (!gameId || !games.has(gameId)) return;

    const game = games.get(gameId);

    const playerIndex = game.players.findIndex(p => p.id === playerId);

    if (playerIndex !== -1) {
      // Mark player as disconnected instead of removing
      game.players[playerIndex].connected = false;

      // If it's this player's turn, skip them
      if (game.state === 'WAITING_FOR_COLOR' &&
        game.currentPlayerIndex === playerIndex) {
        // Move to next player
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      }

      updateActivity();

      // Broadcast updated state
      /** @type {ServerMessage} */
      const gameUpdateMessage = { type: 'GAME_UPDATE', gameState: game };
      io.to(gameId).emit('GAME_UPDATE', gameUpdateMessage);

      console.log(`Player ${playerId} disconnected from game ${gameId}`);
    }
  });
});

// Add a simple root route
app.get('/', (req, res) => {
  res.send('Color Namer Game Server is running');
});

// Status route for health checks
app.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    games: games.size,
    uptime: process.uptime()
  });
});

// Start server
const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export { httpServer, io, games }; // Export for testing purposes
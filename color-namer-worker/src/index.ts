import type {
  Color,
  GameState,
  Player,
  ClientMessage,
  ServerMessage
} from "../../src/lib/types";

// In-memory store for WebSocket connections
const connections = new Map();
// Track last activity time for each player
const playerLastSeen = new Map();
// Timeout in milliseconds (2 minutes)
const PLAYER_TIMEOUT = 120000;

export default {
	async fetch(request, env, ctx) {
		// Handle WebSocket upgrades
		if (request.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
			console.log('WebSocket connection requested');
			try {
				return await handleWebSocket(request, env);
			} catch (error) {
				console.error('WebSocket handling error:', error);
				return new Response('WebSocket error: ' + error.message, { status: 500 });
			}
		}

		// For non-WebSocket requests, return a simple HTML response
		return new Response('This is the Color Namer game server. Connect via WebSocket.', {
			headers: {
				'Content-Type': 'text/html',
				'Access-Control-Allow-Origin': '*',
			},
		});
	},
};

async function handleWebSocket(request, env) {
	const url = new URL(request.url);
	const gameId = url.searchParams.get('gameId') || generateGameId();
	console.log('WebSocket connection to game:', gameId);

	// Create WebSocket pair
	const pair = new WebSocketPair();
	const [client, server] = Object.values(pair);

	// Accept the WebSocket connection
	server.accept();

	// Generate a unique user ID
	let playerId = crypto.randomUUID();

	// Send initial connection message
	server.send(
		JSON.stringify({
			type: 'CONNECTED',
			gameId,
			playerId,
		})
	);

	// Set up polling for game updates
	let lastCheckTime = Date.now();
	const pollInterval = setInterval(async () => {
		try {
			// Check for inactive players
			await checkInactivePlayers(gameId, env);

			// Get current game state
			const gameState = await getGameState(gameId, env);

			// Get new updates
			const updates = await getGameUpdates(gameId, lastCheckTime, env);
			lastCheckTime = Date.now();

			// If there are updates, send the latest game state
			if (updates.length > 0) {
				server.send(
					JSON.stringify({
						type: 'GAME_UPDATE',
						gameState,
					})
				);
			}
		} catch (error) {
			console.error('Error polling for updates:', error);
		}
	}, 1000); // Poll every second

	// Handle incoming messages
	server.addEventListener('message', async (event) => {
		try {
			const message = JSON.parse(event.data) as ClientMessage;
			console.log('Received message:', message);

			// Get current game state
			let gameState = await getGameState(gameId, env);

			switch (message.type) {
				case 'JOIN_GAME':
					// Add player to game
					const player = {
						id: playerId,
						name: message.name,
						color: message.color,
						guess: null,
						connected: true,
						lastSeen: Date.now(),
					};

					gameState.players.push(player);

					// Update player's last activity time
					playerLastSeen.set(playerId, Date.now());

					console.log(`Player ${message.name} joined game ${gameId}`);
					break;

				case 'SET_COLOR':
					// If color is null, it means the host is starting the game
					if (message.color === null) {
						gameState.state = 'WAITING_FOR_COLOR';
						console.log(`Game ${gameId} started: WAITING_FOR_COLOR`);
					}
					// If we have a color and clue, transition to guessing state
					else if (message.color && message.clue) {
						gameState.currentColor = message.color;
						gameState.clue = message.clue;
						gameState.state = 'GUESSING';
						console.log(`Game ${gameId} color set: ${JSON.stringify(message.color)}, clue: ${message.clue}`);
					}
					// Just updating the color but not submitting yet
					else if (message.color) {
						gameState.currentColor = message.color;
						// Don't change state yet
						console.log(`Game ${gameId} color updated: ${JSON.stringify(message.color)}`);
					}
					break;

				case 'SUBMIT_GUESS':
					// Find player and update guess
					const guessPlayer = gameState.players.find((p) => p.id === playerId);
					if (guessPlayer) {
						guessPlayer.guess = message.color;

						// Check if all players have guessed
						const allGuessed = gameState.players
							.filter((p) => p.id !== gameState.players[0].id) // Skip the describer
							.every((p) => p.guess !== null);

						if (allGuessed) {
							gameState.state = 'REVEAL';
						}
					}
					break;

				case 'NEXT_ROUND':
					// Rotate players
					const firstPlayer = gameState.players.shift();
					if (firstPlayer) gameState.players.push(firstPlayer);

					// Reset game state
					gameState.currentColor = null;
					gameState.clue = '';
					gameState.state = 'WAITING_FOR_COLOR';

					// Reset guesses
					gameState.players.forEach((p) => (p.guess = null));
					break;

				case 'RECONNECT':
					// Validate player against existing game state
					const existingPlayer = gameState.players.find((p) => p.id === message.playerId);

					if (existingPlayer) {
						// Update player information
						existingPlayer.name = message.name || existingPlayer.name;
						existingPlayer.color = message.color || existingPlayer.color;
						existingPlayer.connected = true;

						// Use this player's ID instead of the new one
						playerId = message.playerId;

						console.log(`Player ${message.name} (${message.playerId}) reconnected to game ${gameId}`);

						// Update player's last activity time
						playerLastSeen.set(playerId, Date.now());

						// Send reconnect confirmation
						server.send(
							JSON.stringify({
								type: 'RECONNECTED',
								gameId,
								playerId: message.playerId,
							})
						);

						// Add player activity update
						await storeGameUpdate(
							gameId,
							{
								timestamp: Date.now(),
								type: 'PLAYER_RECONNECTED',
								playerId,
							},
							env
						);

						// Send the current game state immediately
						server.send(
							JSON.stringify({
								type: 'GAME_UPDATE',
								gameState,
							})
						);
					} else {
						// Player not found, treat as a new join
						console.log(`Player ${message.playerId} tried to reconnect but wasn't found in game ${gameId}`);

						// Send new connection info
						server.send(
							JSON.stringify({
								type: 'CONNECTED',
								gameId,
								playerId,
							})
						);
					}
					break;

				case 'HEARTBEAT':
					// Update player's last activity time
					playerLastSeen.set(playerId, Date.now());
					break;
			}

			// Save updated game state
			await saveGameState(gameId, gameState, env);

			// Add update timestamp
			await storeGameUpdate(
				gameId,
				{
					timestamp: Date.now(),
					type: message.type,
					playerId,
				},
				env
			);

			// Send confirmation back to sender
			server.send(
				JSON.stringify({
					type: 'CONFIRMATION',
					messageType: message.type,
					timestamp: Date.now(),
				})
			);
		} catch (error) {
			console.error('Error processing message', error);
		}
	});

	// Handle disconnections
	server.addEventListener('close', async () => {
		clearInterval(pollInterval);

		// Get current game state
		let gameState = await getGameState(gameId, env);

		// Remove player from game
		const playerIndex = gameState.players.findIndex((p) => p.id === playerId);
		if (playerIndex !== -1) {
			gameState.players.splice(playerIndex, 1);

			// Save updated game state
			await saveGameState(gameId, gameState, env);

			// Add update timestamp
			await storeGameUpdate(
				gameId,
				{
					timestamp: Date.now(),
					type: 'PLAYER_LEFT',
					playerId,
				},
				env
			);
		}
	});

	// Return the client end of the WebSocket
	return new Response(null, {
		status: 101,
		webSocket: client,
	});
}

async function getGameState(gameId, env) {
	const data = await env.GAME_STATE.get(`game:${gameId}`);
	return data
		? JSON.parse(data)
		: {
				id: gameId,
				players: [],
				currentColor: null,
				clue: '',
				state: 'WAITING_FOR_PLAYERS',
				activeGuessIndex: 0,
		  };
}

async function saveGameState(gameId, gameState, env) {
	await env.GAME_STATE.put(`game:${gameId}`, JSON.stringify(gameState));
}

async function storeGameUpdate(gameId, update, env) {
	const updatesKey = `updates:${gameId}`;
	const updatesData = await env.GAME_STATE.get(updatesKey);
	const updates = updatesData ? JSON.parse(updatesData) : [];

	// Add new update
	updates.push(update);

	// Keep only the last 50 updates
	const recentUpdates = updates.slice(-50);

	// Store updated updates
	await env.GAME_STATE.put(updatesKey, JSON.stringify(recentUpdates));
}

async function getGameUpdates(gameId, since, env) {
	const updatesKey = `updates:${gameId}`;
	const updatesData = await env.GAME_STATE.get(updatesKey);

	if (!updatesData) return [];

	const updates = JSON.parse(updatesData);
	return updates.filter((u) => u.timestamp > since);
}

function generateGameId() {
	return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Add this function to handle inactive players
async function checkInactivePlayers(gameId, env) {
	const now = Date.now();
	const gameState = await getGameState(gameId, env);
	let gameUpdated = false;

	// Check each player's last activity time
	for (const player of gameState.players) {
		const lastSeen = playerLastSeen.get(player.id) || 0;

		// If player has been inactive for too long and is marked as connected
		if (now - lastSeen > PLAYER_TIMEOUT && player.connected) {
			console.log(`Player ${player.name} (${player.id}) timed out`);

			// Mark player as disconnected
			player.connected = false;
			gameUpdated = true;

			// Store update
			await storeGameUpdate(
				gameId,
				{
					timestamp: now,
					type: 'PLAYER_DISCONNECTED',
					playerId: player.id,
				},
				env
			);

			// If it's this player's turn and game is waiting for input, skip their turn
			if (gameState.state === 'WAITING_FOR_COLOR' && gameState.players[0].id === player.id) {
				// Skip to next player
				const firstPlayer = gameState.players.shift();
				gameState.players.push(firstPlayer);

				console.log(`Skipped turn of disconnected player ${player.name}`);

				// Store update
				await storeGameUpdate(
					gameId,
					{
						timestamp: now,
						type: 'TURN_SKIPPED',
						playerId: player.id,
					},
					env
				);
			}
		}
	}

	// If game state changed, save it
	if (gameUpdated) {
		await saveGameState(gameId, gameState, env);
	}
}

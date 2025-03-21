<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { io, Socket } from "socket.io-client"; // Import Socket.IO client
  import ColorPicker from "./ColorPicker.svelte";
  import ColorDescriber from "./ColorDescriber.svelte";
  import AnswerRevealer from "./AnswerRevealer.svelte";
  import type {
    Color,
    GameState,
    Player,
    ClientMessage,
    ServerMessage,
  } from "./types";
  import { labToRgb, rgbToLab } from "./labToRgb";

  // Core state
  let socket: Socket | null = $state(null);
  let game: GameState = $state({
    id: "",
    players: [],
    currentPlayerIndex: 0,
    state: "WAITING_FOR_PLAYERS",
    currentColor: null,
    clue: "",
  });
  $inspect('Game:',game);

  // Current player
  let me: Player = $state({
    id: "",
    name: "",
    color: {
      lightness: Math.floor(Math.random() * 50 + 25),
      a: Math.floor(Math.random() * 256 - 128),
      b: Math.floor(Math.random() * 256 - 128),
    },
    guess: null,
    connected: true,
  });

  // UI helper state
  let draftName = $state("");
  let draftColor: Color = $state(generateRandomColor());

  // Derived values
  let isMyTurn = $derived(
    game.state === "WAITING_FOR_COLOR" &&
      game.players[game.currentPlayerIndex]?.id === me.id
  );

  let shareLink = $derived(
    game.id
      ? `${window.location.origin}${window.location.pathname}?game=${game.id}`
      : ""
  );

  // #region WebSocket & Session Management
  onMount(() => {
    // Check URL for game ID
    const params = new URLSearchParams(window.location.search);
    const urlGameId = params.get("game");
    if (urlGameId) game.id = urlGameId;

    // Try to restore session
    restoreSession();

    // Connect using Socket.IO instead of WebSocket
    connectSocket();

    return () => {
      if (socket) socket.disconnect();
    };
  });

  // Replace WebSocket connection with Socket.IO
  function connectSocket() {
    // Use your new Render URL
    //const serverUrl = "https://color-namer-ulgb.onrender.com";
    const serverUrl = 'http://localhost:3000'
    $inspect("Connect socket with game", game);
    socket = io(serverUrl, {
      query: game.id ? { gameId: game.id } : {},
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Handle connection events
    socket.on("connect", () => {
      $inspect("Connected to game server", game);

      // Reconnect with existing session if available
      if (me.id && game.id) {
        $inspect("Reconnecting with existing session", game);
        socket!.emit("RECONNECT", {
          playerId: me.id,
          gameId: game.id,
          name: me.name,
          color: me.color,
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from game server");
    });

    // Replace message handling
    socket.on("CONNECTED", (data: ServerMessage) => {
      if (data.type === "CONNECTED") {
        $inspect("Connected", data);
        game.id = data.gameId;
        me.id = data.playerId;

        // Update URL with game ID for sharing
        if (!window.location.search.includes("game=")) {
          const url = new URL(window.location.href);
          url.searchParams.set("game", game.id);
          window.history.pushState({}, "", url);
        }

        saveSession();
      }
    });

    socket.on("RECONNECTED", (data: ServerMessage) => {
      if (data.type === "RECONNECTED") {
        console.log("Successfully reconnected to game");
      }
    });

    socket.on("GAME_UPDATE", (data: ServerMessage) => {
      if (data.type === "GAME_UPDATE") {
        // Update game state
        game = {
          ...game,
          ...data.gameState,
        };

        // Update my player data
        const myPlayer = game.players.find((p) => p.id === me.id);
        if (myPlayer) {
          me = {
            ...me,
            ...myPlayer,
          };
        }
      }
    });

    socket.on("ERROR", (data: ServerMessage) => {
      if (data.type === "ERROR") {
        console.error("Server error:", data.message);
      }
    });

    // Send heartbeat every 30 seconds
    setInterval(() => {
      if (socket && socket.connected) {
        socket.emit("HEARTBEAT");
      }
    }, 30000);
  }

  // Type-safe way to send messages
  function sendMessage(message: ClientMessage) {
    if (socket && socket.connected) {
      socket.emit(message.type, message);
    } else {
      console.warn("Socket not connected, can't send message");
    }
  }

  function saveSession() {
    if (game.id && me.id && me.name) {
      localStorage.setItem(
        "colorNamerSession",
        JSON.stringify({
          gameId: game.id,
          player: {
            id: me.id,
            name: me.name,
            color: me.color,
          },
        })
      );
    }
  }

  function restoreSession() {
    const saved = localStorage.getItem("colorNamerSession");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        game.id = data.gameId;
        game = game;
        if (data.player) {
          me.id = data.player.id;
          me.name = data.player.name;
          me.color = data.player.color;
        }
        me = me;
        $inspect("Updated game", game, "me", me);

        return true;
      } catch (e) {
        console.error("Failed to restore session:", e);
      }
    }
    return false;
  }

  function resetSession() {
    localStorage.removeItem("colorNamerSession");
    if (socket) socket.disconnect();

    game = {
      id: "",
      players: [],
      currentPlayerIndex: 0,
      state: "WAITING_FOR_PLAYERS",
      currentColor: null,
      clue: "",
    };

    me = {
      id: "",
      name: "",
      color: generateRandomColor(),
      guess: null,
      connected: true,
    };

    draftName = "";
    draftColor = generateRandomColor();

    // Update URL
    const url = new URL(window.location.href);
    url.searchParams.delete("game");
    window.history.pushState({}, "", url);

    // Reconnect
    setTimeout(connectSocket, 100);
  }
  // #endregion

  // #region Game Actions
  function joinGame() {
    if (!socket || !draftName) return;

    me.name = draftName;

    socket.emit("JOIN_GAME", {
      name: me.name,
      color: me.color,
      gameId: game.id,
    });

    saveSession();
  }

  function startGame() {
    debugger;
    if (!socket) return;
    socket.emit("SET_COLOR", { color: null });
  }

  function setColorAndClue(color: Color, clue: string) {
    if (!socket) return;
    socket.emit("SET_COLOR", { color, clue });
  }

  function submitGuess(color: Color) {
    if (!socket) return;
    socket.emit("SUBMIT_GUESS", { color });
    me.guess = color; // Optimistic update
  }

  function nextRound() {
    if (!socket) return;
    socket.emit("NEXT_ROUND");
  }

  function resetDraftColor() {
    draftColor = generateRandomColor();
  }

  function generateRandomColor(): Color {
    return {
      lightness: Math.floor(Math.random() * 50 + 25),
      a: Math.floor(Math.random() * 256 - 128),
      b: Math.floor(Math.random() * 256 - 128),
    };
  }

  function submitColorWithDescription(description: string) {
    setColorAndClue(draftColor, description);
  }

  // Helper function for waiting message
  function getWaitingMessage(): string {
    if (game.state === "WAITING_FOR_PLAYERS") {
      return `Waiting for players (${game.players.length}/2)`;
    }

    if (game.state === "WAITING_FOR_COLOR") {
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (!currentPlayer) return "Waiting for a player...";

      if (currentPlayer.id === me.id) {
        return "Your turn to pick a color!";
      }

      return `Waiting for ${currentPlayer.name}${!currentPlayer.connected ? " (disconnected)" : ""}`;
    }

    if (game.state === "GUESSING") {
      // Count players who haven't guessed yet
      const waitingPlayers = game.players
        .filter((p, i) => i !== game.currentPlayerIndex) // Skip the describer
        .filter((p) => !p.guess && p.connected);

      if (waitingPlayers.length === 0) {
        return "Everyone has guessed!";
      }

      return `Waiting for ${waitingPlayers.length} player(s) to guess`;
    }

    return "";
  }
  // #endregion
</script>

<!-- UI remains mostly the same, but references game.players instead of players -->
{#if !me.name}
  <input bind:value={draftName} placeholder="Enter your name" />
  <button onclick={joinGame}>Join Game</button>
{:else if game.state === "WAITING_FOR_COLOR" && isMyTurn}
  <div class="color-picker-container">
    <h2>Your Turn!</h2>
    <p>Name this color for other players to guess</p>
    <button onclick={resetDraftColor}> Generate New Color </button>
    <ColorDescriber
      color={draftColor}
      ondescribe={(description) => submitColorWithDescription(description)}
    />
  </div>
{:else if game.state === "WAITING_FOR_PLAYERS"}
  <div class="waiting">
    <h2>{getWaitingMessage()}</h2>
    {#if game.players.length >= 2}
      <button onclick={startGame}>Start Game</button>
    {/if}
  </div>
{:else if game.state === "GUESSING" && !isMyTurn && !me.guess}
  <!-- Guessing UI -->
  <div class="guessing">
    <h2>Guess the Color</h2>
    <p>Clue: "{game.clue}"</p>
    <ColorPicker onconfirm={(color) => submitGuess(color)} />
  </div>
{:else if game.state === "REVEAL"}
  <AnswerRevealer
    color={game.currentColor!}
    guesses={game.players
      .filter((p, i) => i !== game.currentPlayerIndex)
      .map((p) => ({
        name: p.name,
        color: p.guess,
        userColor: p.color,
      }))}
    description={game.clue}
    onComplete={nextRound}
  />
{:else}
  <div class="waiting">
    <h2>{getWaitingMessage()}</h2>
  </div>
{/if}

<!-- Add the player list and reset button here -->
<div class="game-container">
  {#if !me.name}
    <!-- Name entry screen -->
    <div class="join-screen">
      <h2>{game.id ? "Join Game" : "Create New Game"}</h2>
      <div class="form-group">
        <label for="player-name">Your Name</label>
        <input
          id="player-name"
          type="text"
          bind:value={draftName}
          placeholder="Enter your name"
        />

        <button onclick={joinGame} disabled={!draftName}>
          {game.id ? "Join Game" : "Create Game"}
        </button>
      </div>
    </div>
  {:else}
    <!-- Game screen -->
    <div class="game-layout">
      <!-- Player sidebar -->
      <div class="players-sidebar">
        <h3>Players</h3>

        <div class="share-link">
          <p>Share this link:</p>
          <input type="text" readonly value={shareLink} />
          <button onclick={() => navigator.clipboard.writeText(shareLink)}>
            Copy
          </button>
        </div>

        <ul class="player-list">
          {#each game.players as player, i}
            <li
              class:current={i === game.currentPlayerIndex}
              class:me={player.id === me.id}
              class:disconnected={!player.connected}
            >
              <span
                class="player-color"
                style="background-color: rgb({labToRgb(
                  player.color.lightness,
                  player.color.a,
                  player.color.b
                ).join(',')})"
              ></span>
              {player.name}
              {player.id === me.id ? " (You)" : ""}
              {i === game.currentPlayerIndex ? " 👑" : ""}
              {!player.connected ? " 📴" : ""}
            </li>
          {/each}
        </ul>

        <!-- Reset button -->
        <div class="controls">
          <button class="reset-button" onclick={resetSession}>
            Reset Session
          </button>
        </div>
      </div>

      <!-- Main game area -->
      <div class="game-area">
        {#if game.state === "WAITING_FOR_COLOR" && isMyTurn}
          <div class="color-picker-container">
            <h2>Your Turn!</h2>
            <p>Name this color for other players to guess</p>
            <button onclick={resetDraftColor}>Generate New Color</button>
            <ColorDescriber
              color={draftColor}
              ondescribe={(description) =>
                submitColorWithDescription(description)}
            />
          </div>
        {:else if game.state === "WAITING_FOR_PLAYERS"}
          <div class="waiting">
            <h2>{getWaitingMessage()}</h2>
            {#if game.players.length >= 2}
              <button onclick={startGame}>Start Game</button>
            {/if}
          </div>
        {:else if game.state === "GUESSING" && !isMyTurn && !me.guess}
          <div class="guessing">
            <h2>Guess the Color</h2>
            <p>Clue: "{game.clue}"</p>
            <ColorPicker onconfirm={(color) => submitGuess(color)} />
          </div>
        {:else if game.state === "REVEAL"}
          <AnswerRevealer
            color={game.currentColor}
            guesses={game.players
              .filter((p, i) => i !== game.currentPlayerIndex)
              .map((p) => ({
                name: p.name,
                color: p.guess,
                userColor: p.color,
              }))}
            description={game.clue}
            onComplete={nextRound}
          />
        {:else}
          <div class="waiting">
            <h2>{getWaitingMessage()}</h2>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .game-container {
    font-family: system-ui, -apple-system, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  }
  
  .join-screen {
    max-width: 400px;
    margin: 100px auto;
    padding: 2rem;
    background-color: #f8f9fa;
    border-radius: 8px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    text-align: center;
  }
  
  .form-group {
    margin: 1.5rem 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  
  .form-group label {
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .game-layout {
    display: flex;
    min-height: 600px;
    background: #fff;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }
  
  .players-sidebar {
    width: 250px;
    padding: 1.5rem;
    background: #f8f9fa;
    border-right: 1px solid #e9ecef;
  }
  
  .game-area {
    flex: 1;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .waiting {
    text-align: center;
    max-width: 500px;
  }
  
  .guessing, .color-picker-container {
    width: 100%;
    max-width: 600px;
  }
  
  .player-list {
    list-style: none;
    padding: 0;
    margin: 1rem 0;
  }
  
  .player-
</style>

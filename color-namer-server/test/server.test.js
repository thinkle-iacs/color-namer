import { httpServer } from '../server.js';
import request from 'supertest';
import { expect } from 'chai';
import { io as Client } from 'socket.io-client'; // Import socket.io-client as ES module

describe('Color Namer Server', function () {
  let server;

  before(function (done) {
    if (httpServer.listening) {
      console.log('Server is already running. Closing it before starting tests.');
      httpServer.close(() => {
        server = httpServer.listen(4000, done);
      });
    } else {
      console.log('Starting server on port 4000 for tests.');
      server = httpServer.listen(4000, done);
    }
    return 'ok';
  });

  after(function (done) {
    if (server && server.listening) {
      console.log('Closing server after tests.');
      server.close(done);
    } else {
      console.log('Server was not running.');
      done();
    }
  });

  it('should return status OK', async function () {
    const response = await request(server).get('/status');
    expect(response.status).to.equal(200);
    expect(response.body.status).to.equal('ok');
  });




  it('should create a new game', function (done) {
    const socket = Client('http://localhost:4000');

    socket.on('connect', function () {
      console.log(`[${this.test.title}] Connected to server`);
      socket.emit('CREATE_GAME');
    }.bind(this));

    socket.on('GAME_CREATED', function (data) {
      console.log(`[${this.test.title}] GAME_CREATED event received:`, data);
      expect(data.gameId).to.exist;
      socket.disconnect();
      done();
    }.bind(this));

    socket.on('error', function (err) {
      console.error(`[${this.test.title}] Socket error:`, err);
    }.bind(this));
  });


  it('should send CONNECTED and GAME_UPDATE when a player joins', function (done) {

    const socket = Client('http://localhost:4000', {
      query: { gameId: 'TEST_GAME_1' }
    });
    console.log('Created socket for TEST_GAME_1');

    let receivedConnected = false;
    let receivedGameUpdate = false;

    socket.on('connect', function () {
      console.log('[Test] Socket connected');
      socket.emit('JOIN_GAME', {
        name: 'Player 1',
        color: { lightness: 50, a: 0, b: 0 },
        gameId: 'TEST_GAME_1'
      });
    });

    socket.on('CONNECTED', function (data) {
      console.log('[Test] CONNECTED event received:', data);
      expect(data.gameId).to.equal('TEST_GAME_1');
      expect(data.playerId).to.exist;
      receivedConnected = true;
      checkDone();
    });

    socket.on('GAME_UPDATE', function (game) {
      console.log('[Test] GAME_UPDATE event received:', game);
      expect(game.gameState.players).to.have.lengthOf(1);
      expect(game.gameState.players[0].name).to.equal('Player 1');
      receivedGameUpdate = true;
      checkDone();
    });

    function checkDone() {
      if (receivedConnected && receivedGameUpdate) {
        socket.disconnect();
        done();
      }
    }
  });

  it('should notify all players when a new player joins', function (done) {
    const socket1 = Client('http://localhost:4000', {
      query: { gameId: 'TEST_GAME_2' }
    });

    const socket2 = Client('http://localhost:4000', {
      query: { gameId: 'TEST_GAME_2' }
    });

    let socket1ReceivedUpdate = false;
    let socket2ReceivedConnected = false;

    socket1.on('connect', function () {
      console.log('[Test] Socket1 connected');
      socket1.emit('JOIN_GAME', {
        name: 'Player 1',
        color: { lightness: 50, a: 0, b: 0 },
        gameId: 'TEST_GAME_2'
      });
    });

    socket2.on('connect', function () {
      console.log('[Test] Socket2 connected');
      socket2.emit('JOIN_GAME', {
        name: 'Player 2',
        color: { lightness: 60, a: 10, b: 10 },
        gameId: 'TEST_GAME_2'
      });
    });

    socket1.on('GAME_UPDATE', function (game) {
      console.log('[Test] Socket1 GAME_UPDATE event received:', game);
      if (game.gameState.players.length === 2) {
        expect(game.gameState.players[0].name).to.equal('Player 1');
        expect(game.gameState.players[1].name).to.equal('Player 2');
        socket1ReceivedUpdate = true;
        checkDone();
      }
    });

    socket2.on('CONNECTED', function (data) {
      console.log('[Test] Socket2 CONNECTED event received:', data);
      expect(data.gameId).to.equal('TEST_GAME_2');
      expect(data.playerId).to.exist;
      socket2ReceivedConnected = true;
      checkDone();
    });

    function checkDone() {
      if (socket1ReceivedUpdate && socket2ReceivedConnected) {
        socket1.disconnect();
        socket2.disconnect();
        done();
      }
    }
  });


  it('should allow multiple players to join a game', function (done) {
    const socket1 = Client('http://localhost:4000', {
      query: { gameId: 'MULTIPLAYER_TEST' }
    });

    const socket2 = Client('http://localhost:4000', {
      query: { gameId: 'MULTIPLAYER_TEST' }
    });

    let socket1ReceivedUpdate = false;
    let socket2ReceivedUpdate = false;

    socket1.on('connect', function () {
      console.log('[Test] Socket1 connected');
      socket1.emit('JOIN_GAME', {
        name: 'Player 1',
        color: { lightness: 50, a: 0, b: 0 },
        gameId: 'MULTIPLAYER_TEST'
      });
    });

    socket2.on('connect', function () {
      console.log('[Test] Socket2 connected');
      socket2.emit('JOIN_GAME', {
        name: 'Player 2',
        color: { lightness: 60, a: 10, b: 10 },
        gameId: 'MULTIPLAYER_TEST'
      });
    });

    socket1.on('GAME_UPDATE', function (game) {
      console.log('[Test] Socket1 GAME_UPDATE event received:', game);
      if (game.gameState.players.length === 2) {
        expect(game.gameState.players[0].name).to.equal('Player 1');
        expect(game.gameState.players[1].name).to.equal('Player 2');
        socket1ReceivedUpdate = true;
        checkDone();
      }
    });

    socket2.on('GAME_UPDATE', function (game) {
      console.log('[Test] Socket2 GAME_UPDATE event received:', game);
      if (game.gameState.players.length === 2) {
        expect(game.gameState.players[0].name).to.equal('Player 1');
        expect(game.gameState.players[1].name).to.equal('Player 2');
        socket2ReceivedUpdate = true;
        checkDone();
      }
    });

    function checkDone() {
      if (socket1ReceivedUpdate && socket2ReceivedUpdate) {
        socket1.disconnect();
        socket2.disconnect();
        done();
      }
    }
  });

  it('The game state should be waiting until we start', function (done) {
    const socket = Client('http://localhost:4000', {
      query: { gameId: 'WAITING_GAME_STATE_TEST' }
    });

    socket.on('connect', function () {
      console.log('[Test] Socket connected');
      socket.emit('JOIN_GAME', {
        name: 'Player 1',
        color: { lightness: 50, a: 0, b: 0 },
        gameId: 'WAITING_GAME_STATE_TEST'
      });
    });

    socket.on('GAME_UPDATE', function (game) {
      console.log('[Test] GAME_UPDATE event received:', game);
      expect(game.gameState.state).to.equal('WAITING_FOR_PLAYERS'); // Corrected property
      socket.disconnect();
      done();
    });

    socket.on('error', function (err) {
      console.error('[Test] Socket error:', err);
    });
  });

  it('We should allow starting a game with multiple players', function (done) {
    const socket1 = Client('http://localhost:4000', {
      query: { gameId: 'MULTIPLAYER_START_TEST' }
    });
    const socket2 = Client('http://localhost:4000', {
      query: { gameId: 'MULTIPLAYER_START_TEST' }
    });

    let socket1ReceivedUpdate = false;
    let socket2ReceivedUpdate = false;
    let gameReadyToStart = false;

    socket1.on('connect', function () {
      console.log('[Test] Socket1 connected');
      socket1.emit('JOIN_GAME', {
        name: 'Player 1',
        color: { lightness: 50, a: 0, b: 0 },
        gameId: 'MULTIPLAYER_START_TEST'
      });
    });

    socket2.on('connect', function () {
      console.log('[Test] Socket2 connected');
      socket2.emit('JOIN_GAME', {
        name: 'Player 2',
        color: { lightness: 60, a: 10, b: 10 },
        gameId: 'MULTIPLAYER_START_TEST'
      });
    });

    socket1.on('GAME_UPDATE', function (game) {
      console.log('[Test] Socket1 GAME_UPDATE event received:', game);

      // Wait until there are at least two players before starting the game
      if (game.gameState.players.length === 2 && !gameReadyToStart) {
        console.log('[Test] Game is ready to start');
        gameReadyToStart = true;
        socket1.emit('START_GAME'); // Start the game once there are two players
      }

      // Verify the game state after starting
      if (game.gameState.state === 'WAITING_FOR_COLOR') {
        expect(game.gameState.players).to.have.lengthOf(2);
        expect(game.gameState.currentPlayerIndex).to.equal(0); // Ensure it's Player 1's turn
        socket1ReceivedUpdate = true;
        checkDone();
      }
    });

    socket2.on('GAME_UPDATE', function (game) {
      console.log('[Test] Socket2 GAME_UPDATE event received:', game);

      // Verify the game state after starting
      if (game.gameState.state === 'WAITING_FOR_COLOR') {
        expect(game.gameState.players).to.have.lengthOf(2);
        expect(game.gameState.currentPlayerIndex).to.equal(0); // Ensure it's Player 1's turn
        socket2ReceivedUpdate = true;
        checkDone();
      }
    });

    function checkDone() {
      if (socket1ReceivedUpdate && socket2ReceivedUpdate) {
        socket1.disconnect();
        socket2.disconnect();
        done();
      }
    }
  });

  it('We should allow a player to leave a game, and other players should get the updated player list', function (done) {
    const socket1 = Client('http://localhost:4000', {
      query: { gameId: 'LEAVE_GAME_TEST' }
    });
    const socket2 = Client('http://localhost:4000', {
      query: { gameId: 'LEAVE_GAME_TEST' }
    });

    let player2Joined = false;
    let player2Left = false;

    // Player 1 connects and joins the game
    socket1.on('connect', function () {
      console.log('[Test] Socket1 connected');

    });

    // Player 2 connects and joins the game
    socket2.on('connect', function () {
      console.log('[Test] Socket2 connected');
    });

    // Player 1 receives GAME_UPDATE when Player 2 joins
    socket1.on('GAME_UPDATE', function (game) {
      console.log('[Test] Socket1 GAME_UPDATE event received:', game);

      if (game.gameState.players.length === 2 && !player2Joined) {
        expect(game.gameState.players[0].name).to.equal('Player 1');
        expect(game.gameState.players[1].name).to.equal('Player 2');
        player2Joined = true;

        // Player 2 leaves the game
        console.log('Time for player 2 to leave...');
        socket2.emit('LEAVE_GAME', { playerId: socket2.id, gameId: 'LEAVE_GAME_TEST' });
      } else if (game.gameState.players.length === 1 && player2Joined) {
        expect(game.gameState.players[0].name).to.equal('Player 1');
        player2Left = true;
        checkDone();
      }
    });

    // Player 2 disconnects
    socket2.on('disconnect', function () {
      console.log('[Test] Socket2 disconnected');
    });

    function checkDone() {
      if (player2Joined && player2Left) {
        socket1.disconnect();
        socket2.disconnect();
        done();
      }
    }

    socket1.emit('JOIN_GAME', {
      name: 'Player 1',
      color: { lightness: 50, a: 0, b: 0 },
      gameId: 'LEAVE_GAME_TEST'
    });
    socket2.emit('JOIN_GAME', {
      name: 'Player 2',
      color: { lightness: 60, a: 10, b: 10 },
      gameId: 'LEAVE_GAME_TEST'
    });
  });

  it('should transition to WAITING_FOR_COLOR when the game starts', function (done) {
    const socket1 = Client('http://localhost:4000', {
      query: { gameId: 'START_GAME_TEST' }
    });
    const socket2 = Client('http://localhost:4000', {
      query: { gameId: 'START_GAME_TEST' }
    });

    let gameStarted = false;

    socket1.on('connect', function () {
      socket1.emit('JOIN_GAME', {
        name: 'Player 1',
        color: { lightness: 50, a: 0, b: 0 },
        gameId: 'START_GAME_TEST'
      });
    });

    socket2.on('connect', function () {
      socket2.emit('JOIN_GAME', {
        name: 'Player 2',
        color: { lightness: 60, a: 10, b: 10 },
        gameId: 'START_GAME_TEST'
      });
    });

    socket1.on('GAME_UPDATE', function (game) {
      if (game.gameState.players.length === 2 && !gameStarted) {
        gameStarted = true;
        socket1.emit('START_GAME', { gameId: 'START_GAME_TEST' });
      } else if (game.gameState.state === 'WAITING_FOR_COLOR') {
        expect(game.gameState.currentPlayerIndex).to.equal(0);
        expect(game.gameState.state).to.equal('WAITING_FOR_COLOR');
        socket1.disconnect();
        socket2.disconnect();
        done();
      }
    });
  });

  it('should handle one full game round with 3 players, ensuring each player gets a turn', function (done) {
    const socket1 = Client('http://localhost:4000', {
      query: { gameId: 'ONE_ROUND_TEST' }
    });
    const socket2 = Client('http://localhost:4000', {
      query: { gameId: 'ONE_ROUND_TEST' }
    });
    const socket3 = Client('http://localhost:4000', {
      query: { gameId: 'ONE_ROUND_TEST' }
    });

    let turnCount = 0; // Track how many turns have been completed
    let currentTurnPlayer = 0; // Track whose turn it is

    function setColorAndClue(socket, color, clue) {
      socket.emit('SET_COLOR', { color, clue });
    }

    function submitGuess(socket, color) {
      socket.emit('SUBMIT_GUESS', { color });
    }

    [socket1, socket2, socket3].forEach((socket, index) => {
      socket.on('GAME_UPDATE', function (game) {
        console.log(`[Test] Player ${index + 1} received GAME_UPDATE:`, game);

        if (game.gameState.state === 'WAITING_FOR_COLOR' && game.gameState.currentPlayerIndex === currentTurnPlayer) {
          // It's the current player's turn to set a color and clue
          const color = { lightness: 50 + currentTurnPlayer * 10, a: 10, b: 20 };
          const clue = `Clue ${currentTurnPlayer + 1}`;
          console.log(`[Test] Player ${currentTurnPlayer + 1} setting color and clue`);
          setColorAndClue([socket1, socket2, socket3][currentTurnPlayer], color, clue);
        } else if (game.gameState.state === 'GUESSING') {
          // All players except the current player submit guesses
          const guessColor = { lightness: 60, a: 15, b: 25 };
          [socket1, socket2, socket3].forEach((s, i) => {
            if (i !== currentTurnPlayer) {
              console.log(`[Test] Player ${i + 1} submitting guess`);
              submitGuess(s, guessColor);
            }
          });
        } else if (game.gameState.state === 'WAITING_FOR_COLOR') {
          // Move to the next turn
          currentTurnPlayer = (currentTurnPlayer + 1) % 3;
          turnCount++;

          console.log(`[Test] Turn count incremented to ${turnCount}`);

          // End the test after one full round (each player gets a turn)
          if (turnCount === 3) {
            console.log('[Test] One full round completed. Ending test.');
            socket1.disconnect();
            socket2.disconnect();
            socket3.disconnect();
            done();
          }
        }
      });
    });

    // Connect and join the game
    socket1.on('connect', function () {
      console.log('[Test] Player 1 connected');
      socket1.emit('JOIN_GAME', {
        name: 'Player 1',
        color: { lightness: 50, a: 0, b: 0 },
        gameId: 'ONE_ROUND_TEST'
      });
    });

    socket2.on('connect', function () {
      console.log('[Test] Player 2 connected');
      socket2.emit('JOIN_GAME', {
        name: 'Player 2',
        color: { lightness: 60, a: 10, b: 10 },
        gameId: 'ONE_ROUND_TEST'
      });
    });

    socket3.on('connect', function () {
      console.log('[Test] Player 3 connected');
      socket3.emit('JOIN_GAME', {
        name: 'Player 3',
        color: { lightness: 70, a: 20, b: 20 },
        gameId: 'ONE_ROUND_TEST'
      });
    });

    socket1.on('GAME_UPDATE', function (game) {
      if (game.gameState.players.length === 3 && game.gameState.state === 'WAITING_FOR_PLAYERS') {
        console.log('[Test] Starting the game');
        socket1.emit('START_GAME', { gameId: 'ONE_ROUND_TEST' });
      }
    });
  });

});
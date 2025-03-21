import { httpServer } from '../server.js';
import request from 'supertest';

import { expect } from 'chai';

describe('Color Namer Server', function () {
  let server;

  before(function (done) {
    console.log('Opening server before test on 4000');
    server = httpServer.listen(4000, done);
    console.log('Done opening server');
    return 100
  });

  after(function (done) {
    console.log('Closing server post-test');
    server.close(done);
  });

  it('should return status OK', async function () {
    const response = await request(server).get('/status');
    expect(response.status).to.equal(200);
    expect(response.body.status).to.equal('ok');
  });

  it('should create a new game and join', function (done) {
    const socket = require('socket.io-client')('http://localhost:4000', {
      query: { gameId: 'TESTGAME' }
    });

    let doneCalled = false;

    socket.on('connect', function () {
      socket.emit('JOIN_GAME', {
        name: 'Test Player',
        color: { lightness: 50, a: 0, b: 0 },
        gameId: 'TESTGAME'
      });
    });

    socket.on('CONNECTED', function (data) {
      if (!doneCalled) {
        expect(data.gameId).to.equal('TESTGAME');
        expect(data.playerId).to.exist;
        doneCalled = true;
        socket.disconnect();
        done();
      }
    });

    socket.on('GAME_UPDATE', function (game) {
      if (!doneCalled) {
        expect(game.id).to.equal('TESTGAME');
        expect(game.players.length).to.equal(1);
        expect(game.players[0].name).to.equal('Test Player');
        doneCalled = true;
        socket.disconnect();
        done();
      }
    });

    socket.on('disconnect', function () {
      if (!doneCalled) {
        doneCalled = true;
        done();
      }
    });
  });
});
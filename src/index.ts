import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import Storage from './adapters/Storage';
import audioDAL from './dal/audio';
import clockDAL from './dal/clock';
import sessionDAL from './dal/session';
import * as events from './events';
import audioHandlers from './handlers/audioHandlers';
import clockHandlers from './handlers/clockHandlers';
import sessionHandlers from './handlers/sessionHandlers';

const port = 2000; // default port to listen
// @TODO: switch to HTTPS https://socket.io/docs/v3/server-initialization/#with-an-https-server
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST'],
  },
});

const storage = new Storage();
const audioStorage = audioDAL(storage);
const clockStorage = clockDAL(storage);
const sessionStorage = sessionDAL(storage);

const onConnection = (socket: Socket) => {
  const audio = audioHandlers(io, socket, audioStorage);
  const clock = clockHandlers(io, socket, clockStorage);
  const session = sessionHandlers(io, socket, sessionStorage, audioStorage, clockStorage);

  // Audio routes -- closed
  socket.on(events.AUDIO_PLAY, audio.playAudio);
  socket.on(events.AUDIO_STOP, audio.stopAudio);
  socket.on(events.AUDIO_DELETE, audio.deleteAudio);
  socket.on(events.AUDIO_CREATE, audio.createAudio);
  socket.on(events.AUDIO_SET, audio.setAudio);

  // Audio routes -- open
  socket.on(events.AUDIO_REFRESH, audio.refresh);

  // Clock routes -- closed
  socket.on(events.CLOCK_HOST_PONG, clock.hostPong);

  // Clock routes -- open
  socket.on(events.CLOCK_GET, clock.getClock);
  socket.on(events.CLOCK_PONG, clock.pong);

  // Session routes -- closed
  socket.on(events.SESSION_CREATE, session.createSession);
  socket.on(events.SESSION_DELETE, session.deleteSession);

  // Session routes -- open
  socket.on(events.SESSION_JOIN, session.joinSession);
  socket.on(events.DISCONNECTING, session.leaveAllSessions);
};

io.on('connection', onConnection);

httpServer.listen(port);

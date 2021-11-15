import { Server, Socket } from 'socket.io';
import { readFileSync } from 'fs';
import { createServer as createServerHTTPS } from 'https';
import { createServer as createServerHTTP } from 'http';
import Storage from './adapters/Storage';
import Logger from './adapters/Logger';
import audioDAL from './dal/audio';
import clockDAL from './dal/clock';
import sessionDAL from './dal/session';
import audienceDAL from './dal/audience';
import * as events from './events';
import audioHandlers from './handlers/audioHandlers';
import clockHandlers from './handlers/clockHandlers';
import sessionHandlers from './handlers/sessionHandlers';
import audienceHandlers from './handlers/audienceHandlers';

const origin = ['http://localhost:3000', 'http://localhost:3001'];
if (process.env.HOST1) origin.push(process.env.HOST1);
if (process.env.HOST2) origin.push(process.env.HOST2);
Logger.info(`server is configured for CORS origins: ${origin}`);
Logger.info('to change, edit the env HOST1 and HOST2 variables');

const port = 2000; // default port to listen
// If a key and cert is provided, then 
const server =
  process.env.KEY && process.env.CERT
    ? createServerHTTPS({
        key: readFileSync(process.env.KEY),
        cert: readFileSync(process.env.CERT),
      })
    : createServerHTTP();

const io = new Server(server, {
  cors: {
    origin,
    methods: ['GET', 'POST'],
  },
});

const storage = new Storage();
const audioStorage = audioDAL(storage);
const clockStorage = clockDAL(storage);
const sessionStorage = sessionDAL(storage);
const audienceStorage = audienceDAL(storage);

const onConnection = (socket: Socket) => {
  const audio = audioHandlers(io, socket, audioStorage);
  const clock = clockHandlers(io, socket, clockStorage, sessionStorage);
  const session = sessionHandlers(
    io,
    socket,
    sessionStorage,
    audioStorage,
    clockStorage,
    audienceStorage,
  );
  const audience = audienceHandlers(io, socket, audienceStorage, sessionStorage);

  // Audio routes -- closed
  socket.on(events.AUDIO_PLAY, audio.playAudio);
  socket.on(events.AUDIO_STOP, audio.stopAudio);
  socket.on(events.AUDIO_DELETE, audio.deleteAudio);
  socket.on(events.AUDIO_CREATE, audio.createAudio);
  socket.on(events.AUDIO_SET, audio.setAudio);
  socket.on(events.AUDIO_MOVE, audio.moveAudio);

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

  // Audience routes -- open
  socket.on(events.AUDIENCE_POS_SET, audience.setPosition);
};

io.on('connection', onConnection);

server.listen(port);

import { Server, Socket } from 'socket.io';
import { createServer } from 'http';
import Storage from './adapters/Storage';
import * as events from './events';
import audioHandlers from './handlers/audioHandlers';
import clockHandlers from './handlers/clockHandlers';
import sessionHandlers from './handlers/sessionHandlers';

const port = 2000; // default port to listen
// @TODO: switch to HTTPS https://socket.io/docs/v3/server-initialization/#with-an-https-server
const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

const storage = new Storage();

const onConnection = (socket: Socket) => {
  const audio = audioHandlers(io, socket, storage);
  const clock = clockHandlers(io, socket, storage);
  const session = sessionHandlers(io, socket, storage);

  // Audio routes -- closed
  socket.on(events.AUDIO_PLAY, audio.playAudio);
  socket.on(events.AUDIO_STOP, audio.stopAudio);
  socket.on(events.AUDIO_DELETE, audio.deleteAudio);
  socket.on(events.AUDIO_CREATE, audio.createAudio);
  socket.on(events.AUDIO_SET, audio.setAudio);

  // Audio routes -- open
  socket.on(events.AUDIO_LIST, audio.listAudio);
  socket.on(events.AUDIO_PLAY_LIST, audio.playListAudio);
  socket.on(events.AUDIO_META_GET, audio.getAudioMeta);
  socket.on(events.AUDIO_GET, audio.getAudio);

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
};

io.on('connection', onConnection);

httpServer.listen(port);

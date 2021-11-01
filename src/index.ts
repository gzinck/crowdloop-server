import { Server, Socket } from 'socket.io';
import Storage from './adapters/Storage';
import * as ROUTES from './routes';
import audioHandlers from './handlers/audioHandlers';
import clockHandlers from './handlers/clockHandlers';
import sessionHandlers from './handlers/sessionHandlers';

const port = 2000; // default port to listen
const io = new Server(port);

const redisPort = 6379;
const storage = new Storage();

const onConnection = (socket: Socket) => {
  const audio = audioHandlers(io, socket, storage);
  const clock = clockHandlers(io, socket, storage);
  const session = sessionHandlers(io, socket, storage);

  // Audio routes -- closed
  socket.on(ROUTES.AUDIO_PLAY_ROUTE, audio.playAudio);
  socket.on(ROUTES.AUDIO_STOP_ROUTE, audio.stopAudio);
  socket.on(ROUTES.AUDIO_DELETE_ROUTE, audio.deleteAudio);
  socket.on(ROUTES.AUDIO_CREATE_ROUTE, audio.createAudio);
  socket.on(ROUTES.AUDIO_SET_ROUTE, audio.setAudio);

  // Audio routes -- open
  socket.on(ROUTES.AUDIO_LIST_ROUTE, audio.listAudio);
  socket.on(ROUTES.AUDIO_PLAY_LIST_ROUTE, audio.playListAudio);
  socket.on(ROUTES.AUDIO_META_GET_ROUTE, audio.getAudioMeta);
  socket.on(ROUTES.AUDIO_GET_ROUTE, audio.getAudio);

  // Clock routes -- closed
  socket.on(ROUTES.CLOCK_HOST_PONG_ROUTE, clock.hostPong);

  // Clock routes -- open
  socket.on(ROUTES.CLOCK_GET_ROUTE, clock.getClock);
  socket.on(ROUTES.CLOCK_PONG_ROUTE, clock.pong);

  // Session routes -- closed
  socket.on(ROUTES.SESSION_CREATE_ROUTE, session.createSession);
  socket.on(ROUTES.SESSION_DELETE_ROUTE, session.deleteSession);

  // Session routes -- open
  socket.on(ROUTES.SESSION_JOIN_ROUTE, session.joinSession);
};

io.on('connection', onConnection);

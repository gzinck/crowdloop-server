import { Server, Socket } from 'socket.io';
import Storage from '../adapters/Storage';
import { AudioDAL } from '../dal/audio';
import * as events from '../events';

const sessionHandlers = (io: Server, socket: Socket, storage: Storage, audioStorage: AudioDAL) => {
  // @TODO: create a session ID to return back and create a room
  const createSession = () => {
    socket.emit(events.CLOCK_PING, {
      startTime: performance.now(),
    });
  };

  // @TODO: make sure the room exists
  const joinSession = (sessionID: string) => {
    storage.sadd(sessionID, socket.id);
    socket.join(sessionID);
  };

  const deleteSession = (sessionID: string) => {
    audioStorage.deleteAll(sessionID);
    storage.del(`${sessionID}-clock`); // @TODO refactor with dal
    storage.del(sessionID);
    io.to(sessionID).emit(events.SESSION_DELETE);
  };

  return {
    createSession,
    joinSession,
    deleteSession,
  };
};

export default sessionHandlers;

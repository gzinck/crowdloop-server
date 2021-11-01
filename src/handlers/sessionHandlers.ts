import { Server, Socket } from 'socket.io';
import Storage from '../adapters/Storage';
import * as ROUTES from '../routes';

const sessionHandlers = (io: Server, socket: Socket, storage: Storage) => {
  // @TODO: create a session ID to return back and create a room
  const createSession = () => {
    socket.emit(ROUTES.CLOCK_PING_ROUTE, {
      startTime: performance.now(),
    });
  };

  // @TODO: make sure the room exists
  const joinSession = (sessionID: string) => {
    storage.sadd(sessionID, socket.id);
    socket.join(sessionID);
  };

  const deleteSession = (sessionID: string) => {
    // @TODO: delete all of the data from redis
    // THIS IS A BIG DEAL. Need to refactor with a DAL.
    storage.del(sessionID);
    io.to(sessionID).emit(ROUTES.SESSION_DELETE_ROUTE);
  };

  return {
    createSession,
    joinSession,
    deleteSession,
  };
};

export default sessionHandlers;

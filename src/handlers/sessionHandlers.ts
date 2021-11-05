import { Server, Socket } from 'socket.io';
import { AudioDAL } from '../dal/audio';
import { SessionDAL } from '../dal/session';
import { ClockDAL } from '../dal/clock';
import * as events from '../events';

const sessionHandlers = (
  io: Server,
  socket: Socket,
  sessionStorage: SessionDAL,
  audioStorage: AudioDAL,
  clockStorage: ClockDAL,
) => {
  // @TODO: create a session ID to return back and create a room
  const createSession = () => {
    socket.emit(events.CLOCK_PING, {
      startTime: performance.now(),
    });
  };

  // @TODO: make sure the room exists
  const joinSession = (sessionID: string) => {
    sessionStorage.addToSession(sessionID, socket.id);
    socket.join(sessionID);
  };

  const deleteSession = (sessionID: string) => {
    audioStorage.deleteAll(sessionID);
    clockStorage.deleteClock(sessionID);
    sessionStorage.deleteSession(sessionID);
    io.to(sessionID).emit(events.SESSION_DELETE);
  };

  const leaveAllSessions = () => {
    for (const sessionID of socket.rooms) {
      if (sessionID !== socket.id) {
        // leave the session
        sessionStorage.removeFromSession(sessionID, socket.id);
      }
    }
  };

  return {
    createSession,
    joinSession,
    deleteSession,
    leaveAllSessions,
  };
};

export default sessionHandlers;

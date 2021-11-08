import { Server, Socket } from 'socket.io';
import { AudioDAL } from '../dal/audio';
import { SessionDAL } from '../dal/session';
import { ClockDAL } from '../dal/clock';
import { AudienceDAL } from '../dal/audience';
import * as events from '../events';

const sessionHandlers = (
  io: Server,
  socket: Socket,
  sessionStorage: SessionDAL,
  audioStorage: AudioDAL,
  clockStorage: ClockDAL,
  audienceStorage: AudienceDAL,
) => {
  // @TODO: create a session ID to return back and create a room
  const createSession = (sessionID: string) => {
    sessionStorage.setHost(sessionID, socket.id);
    socket.emit(events.CLOCK_PING, {
      startTime: performance.now(),
    });

    // Get audience members who joined early
    sessionStorage
      .getSessionMembers(sessionID)
      .then((ids) => audienceStorage.listPositions(ids))
      .then((posList) => io.to(sessionID).emit(events.AUDIENCE_POS_LIST, posList));
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

    // Delete the positions of everybody
    io.in(sessionID).allSockets().then((members) => {
      audienceStorage.deletePosition(...members);
    });

    // Notify everybody the session is over
    io.to(sessionID).emit(events.SESSION_DELETE);

    // Notify the host that there is one fewer member
    sessionStorage.getHost(sessionID).then((host) => {
      io.to(host).emit(events.SESSION_DELETE);
    });
  };

  const leaveAllSessions = () => {
    // Delete the physical position
    audienceStorage.deletePosition(socket.id);

    for (const sessionID of socket.rooms) {
      if (sessionID !== socket.id) {
        // leave the session
        sessionStorage.removeFromSession(sessionID, socket.id);
        audienceStorage.deletePosition(socket.id);
        io.to(sessionID).emit(events.AUDIENCE_DISCONNECT);
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

import { Server, Socket } from 'socket.io';
import Logger from '../adapters/Logger';
import { ClockDAL } from '../dal/clock';
import { SessionDAL } from '../dal/session';
import * as events from '../events';

interface PongReq {
  deltas?: number[]; // Should not be sending this, should persist on server
  sessionID: string;
  startTime: number;
  clientTime: number;
}

const NUM_PONGS = 5;

const clockHandlers = (io: Server, socket: Socket, clockStorage: ClockDAL, sessionStorage: SessionDAL) => {
  // Make sure the host calls this before any clients do
  const getClock = () => {
    socket.emit(events.CLOCK_PING, {
      startTime: performance.now(),
    });
  };

  // @TODO: protect this route
  // @TODO: DRY
  const hostPong = (req: PongReq) => {
    const serverTime = performance.now();
    const hostLatency = (serverTime - req.startTime) / 2;
    const hostTime = req.clientTime + hostLatency;
    const hostDelta = serverTime - hostTime;

    const deltas = [...(req.deltas || []), hostDelta];
    Logger.info(`host pong has deltas ${deltas}`);
    if (deltas.length === NUM_PONGS) {
      const avgDelta = deltas.reduce((sm, a) => sm + a, 0) / NUM_PONGS;
      clockStorage.setHostDelta(req.sessionID, avgDelta);

      // Start updating all clients in the session
      sessionStorage.getSessionMembers(req.sessionID).then((members) => {
        members.forEach(socketID => {
          io.to(socketID).emit(events.CLOCK_PING, {
            startTime: performance.now(),
          });
        });
      });
    } else {
      socket.emit(events.CLOCK_PING, {
        startTime: performance.now(),
        deltas,
      });
    }
  };

  const pong = (req: PongReq) => {
    const serverTime = performance.now();
    const clientLatency = (serverTime - req.startTime) / 2;
    const clientTime = req.clientTime + clientLatency;
    const clientDelta = serverTime - clientTime;

    const deltas = [...(req.deltas || []), clientDelta];
    Logger.info(`client pong has deltas ${deltas}`);
    if (deltas.length === NUM_PONGS) {
      const avgDelta = deltas.reduce((sm, a) => sm + a, 0) / NUM_PONGS;
      clockStorage.getHostDelta(req.sessionID).then((hostDelta) => {
        socket.emit(events.CLOCK_GET, avgDelta - hostDelta);
      });
    } else {
      socket.emit(events.CLOCK_PING, {
        startTime: performance.now(),
        deltas,
      });
    }
  };

  return {
    getClock,
    hostPong,
    pong,
  };
};

export default clockHandlers;

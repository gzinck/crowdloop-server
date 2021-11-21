import { Server, Socket } from 'socket.io';
import Logger from '../adapters/Logger';
import { ClockDAL } from '../dal/clock';
import { SessionDAL } from '../dal/session';
import { removeOutliers, median } from '../utils/math';
import * as events from '../events';

interface PongReq {
  deltas?: number[]; // Should not be sending this, should persist on server
  sessionID: string;
  startTime: number;
  clientTime: number;
}

const NUM_PONGS_ROUND_1 = 5;
const NUM_PONGS = 10;
const PONG_PAUSE = 1000;

const clockHandlers = (
  io: Server,
  socket: Socket,
  clockStorage: ClockDAL,
  sessionStorage: SessionDAL,
) => {
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

    // Send the updated clock after 10 pings (more pings = more time, but more consistent)
    if (deltas.length >= NUM_PONGS) {
      const meanDelta = median(removeOutliers(deltas));
      clockStorage.setHostDelta(req.sessionID, meanDelta);

      // Start updating all clients in the session
      sessionStorage.getSessionMembers(req.sessionID).then((members) => {
        members.forEach((socketID) => {
          io.to(socketID).emit(events.CLOCK_PING, {
            startTime: performance.now(),
          });
        });
      });
    } else {
      setTimeout(() => {
        socket.emit(events.CLOCK_PING, {
          startTime: performance.now(),
          deltas,
        });
      }, PONG_PAUSE);
    }
  };

  const pong = (req: PongReq) => {
    const serverTime = performance.now();
    const clientLatency = (serverTime - req.startTime) / 2;
    const clientTime = req.clientTime + clientLatency;
    const clientDelta = serverTime - clientTime;

    const deltas = [...(req.deltas || []), clientDelta];
    Logger.info(`client pong has deltas ${deltas}`);

    // Send the updated clock after 5 or 10 tries
    if (deltas.length >= NUM_PONGS || deltas.length === NUM_PONGS_ROUND_1) {
      const meanDelta = median(removeOutliers(deltas));
      clockStorage.getHostDelta(req.sessionID).then((hostDelta) => {
        socket.emit(events.CLOCK_GET, meanDelta - hostDelta);
      });
    }

    // Keep pinging
    if (deltas.length < NUM_PONGS) {
      setTimeout(() => {
        socket.emit(events.CLOCK_PING, {
          startTime: performance.now(),
          deltas,
        });
      }, PONG_PAUSE);
    }
  };

  return {
    getClock,
    hostPong,
    pong,
  };
};

export default clockHandlers;

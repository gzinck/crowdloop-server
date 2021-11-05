import { Server, Socket } from 'socket.io';
import { ClockDAL } from '../dal/clock';
import * as events from '../events';

interface PongReq {
  sessionID: string;
  startTime: number;
  clientTime: number;
}

const clockHandlers = (io: Server, socket: Socket, clockStorage: ClockDAL) => {
  // Make sure the host calls this before any clients do
  const getClock = () => {
    socket.emit(events.CLOCK_PING, {
      startTime: performance.now(),
    });
  };

  // @TODO: protect this route
  const hostPong = (req: PongReq) => {
    const serverTime = performance.now();
    const hostLatency = (serverTime - req.startTime) / 2;
    const hostTime = req.clientTime + hostLatency;

    // To get the time on the host, take serverTime and subtract hostDelta
    const hostDelta = serverTime - hostTime;
    clockStorage.setHostDelta(req.sessionID, hostDelta);
  };

  const pong = (req: PongReq) => {
    const serverTime = performance.now();
    const clientLatency = (serverTime - req.startTime) / 2;
    const clientTime = req.clientTime + clientLatency;
    const clientDelta = serverTime - clientTime;

    clockStorage.getHostDelta(req.sessionID).then((hostDelta) => {
      socket.emit(events.CLOCK_GET, clientDelta - hostDelta);
    });
  };

  return {
    getClock,
    hostPong,
    pong,
  };
};

export default clockHandlers;

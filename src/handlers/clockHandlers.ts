import { Server, Socket } from 'socket.io';
import Storage from '../adapters/Storage';
import * as events from '../events';

interface PongReq {
  sessionID: string;
  startTime: number;
  clientTime: number;
}

const getClockID = (sessionID: string) => `${sessionID}-clock`;

const clockHandlers = (io: Server, socket: Socket, storage: Storage) => {
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
    storage.set(getClockID(req.sessionID), `${hostDelta}`);
  };

  const pong = (req: PongReq) => {
    const serverTime = performance.now();
    const clientLatency = (serverTime - req.startTime) / 2;
    const clientTime = req.clientTime + clientLatency;
    const clientDelta = serverTime - clientTime;

    storage.get(getClockID(req.sessionID)).then((data) => {
      const hostDelta = +data;
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

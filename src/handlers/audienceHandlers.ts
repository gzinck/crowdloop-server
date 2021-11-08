import { Server, Socket } from 'socket.io';
import { AudienceDAL } from '../dal/audience';
import { SessionDAL } from '../dal/session';
import { AudiencePos } from '../models/audience';
import * as events from '../events';

export interface AudiencePosReq extends AudiencePos {
  sessionID: string;
}

const audienceHandlers = (
  io: Server,
  socket: Socket,
  audienceStorage: AudienceDAL,
  sessionStorage: SessionDAL,
) => {
  const setPosition = (pos: AudiencePosReq) => {
    audienceStorage.setPosition(pos);

    // Tell the host the position
    sessionStorage.getHost(pos.sessionID).then((host) => {
      io.to(host).emit(events.AUDIENCE_POS_SET, pos);
    });
  };

  return {
    setPosition,
  };
};

export default audienceHandlers;

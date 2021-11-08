import { Server, Socket } from 'socket.io';
import { AudienceDAL } from '../dal/audience';
import { AudiencePos } from '../models/audience';
import * as events from '../events';

export interface AudiencePosReq extends AudiencePos {
  sessionID: string;
}

const audienceHandlers = (io: Server, socket: Socket, audienceStorage: AudienceDAL) => {
  const setPosition = (pos: AudiencePosReq) => {
    audienceStorage.setPosition(pos);
    io.to(pos.sessionID).emit(events.AUDIENCE_POS_SET, pos);
  };

  return {
    setPosition,
  };
};

export default audienceHandlers;

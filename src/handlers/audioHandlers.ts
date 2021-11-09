import { Server, Socket } from 'socket.io';
import { AudioDAL } from '../dal/audio';
import {
  AudioID,
  AudioPlayRequest,
  CreateAudioRequest,
  AudioPacket,
  MoveAudioRequest,
} from '../models/audio';
import * as events from '../events';

/**
 * @param io the socket.io server
 * @param socket the socket connected at the moment
 * @param dal the data access layer for audio information in redis
 */
const audioHandlers = (io: Server, socket: Socket, dal: AudioDAL) => {
  // TODO add auth for the following endpoints
  const playAudio = (req: AudioPlayRequest) => {
    dal.startPlaying(req);
    io.to(req.sessionID).emit(events.AUDIO_PLAY, req);
  };

  const stopAudio = (req: AudioID) => {
    dal.stopPlaying(req);
    io.to(req.sessionID).emit(events.AUDIO_STOP, req);
  };

  const createAudio = (req: CreateAudioRequest): void => {
    dal.createAudio(req);
    io.to(req.sessionID).emit(events.AUDIO_CREATE, req);
  };

  const setAudio = (req: AudioPacket): void => {
    dal.setAudio(req);
    io.to(req.sessionID).emit(events.AUDIO_SET, req);
  };

  const moveAudio = (req: MoveAudioRequest): void => {
    dal.move(req);
    io.to(req.sessionID).emit(events.AUDIO_MOVE, req);
  };

  const deleteAudio = (req: AudioID): void => {
    dal.deleteAudio(req);
    io.to(req.sessionID).emit(events.AUDIO_DELETE, req);
  };

  // The following can be hit by anyone

  const refresh = (sessionID: string): void => {
    dal.listAudio(sessionID).then((audioIDs) => {
      // Get each audio file
      audioIDs.forEach((loopID) => {
        dal.getAudioMeta({ sessionID, loopID }).then((meta) => {
          // If the meta does not exist, we should remove it from the session
          if (!meta) {
            dal.deleteAudio({ sessionID, loopID });
            return;
          }

          socket.emit(events.AUDIO_CREATE, meta);
          // Cycle through all the audio files and send them back
          for (let packet = 0; packet < meta.nPackets; packet++) {
            dal.getAudioPacket({ sessionID, loopID, packet }).then((packet) => {
              socket.emit(events.AUDIO_SET, packet);
            });
          }
        });
      });
    });
  };

  return {
    playAudio,
    stopAudio,
    createAudio,
    setAudio,
    moveAudio,
    deleteAudio,
    refresh,
  };
};

export default audioHandlers;

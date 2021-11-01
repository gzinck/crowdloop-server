import { Server, Socket } from 'socket.io';
import Storage from '../adapters/Storage';
import * as ROUTES from '../routes';

const getAudioID = (sessionID: string, id: string, packet?: number): string => {
  return `audiofile-${sessionID}-${id}${packet !== undefined ? `-${packet}` : ''}`;
};

interface AudioMetadata {
  sessionID: string;
  loopID: string;
}

interface CreateAudioMetadata extends AudioMetadata {
  startAt: number;
  nPackets: number;
  bpbar: number; // beats per bar
  bpm: number; // beats per minute
  nBars: number; // number of bars in new loops
}

interface DeleteAudioMetadata extends AudioMetadata {
  nPackets: number;
}

interface AudioPacketMetadata extends AudioMetadata {
  packet: number;
}

interface AudioPacket extends AudioPacketMetadata {
  file: Blob;
}

/**
 * @param io the socket.io server
 * @param socket the socket connected at the moment
 * @param redis the regular redis client for storing strings
 * @param redisBuf the redis client for storing buffers
 */
const audioHandlers = (io: Server, socket: Socket, storage: Storage) => {
  // TODO add auth for the following endpoints
  const playAudio = (req: AudioMetadata) => {
    storage.sadd(`session-playing-${req.sessionID}`, req.loopID);
    io.to(req.sessionID).emit(ROUTES.AUDIO_PLAY_ROUTE, req);
  };

  const stopAudio = (req: AudioMetadata) => {
    storage.srem(`session-playing-${req.sessionID}`, req.loopID);
    io.to(req.sessionID).emit(ROUTES.AUDIO_STOP_ROUTE, req);
  };

  const createAudio = (meta: CreateAudioMetadata): void => {
    const id = getAudioID(meta.sessionID, meta.loopID);

    storage.set(id, JSON.stringify(meta));
    storage.sadd(`session-${meta.sessionID}`, id);
    storage.sadd(`session-playing-${meta.sessionID}`, id);

    // Publish the new audio data to the room
    io.to(meta.sessionID).emit(ROUTES.AUDIO_CREATE_ROUTE, meta);
  };

  const setAudio = (audio: AudioPacket): void => {
    const id = getAudioID(audio.sessionID, audio.loopID, audio.packet);

    // Serialize the data and save it
    audio.file.arrayBuffer().then((buf) => {
      storage.set(id, new Buffer(buf));
    });

    // Publish the new audio data to the room
    io.to(audio.sessionID).emit(ROUTES.AUDIO_SET_ROUTE, audio);
  };

  const deleteAudio = (req: DeleteAudioMetadata): void => {
    const id = getAudioID(req.sessionID, req.loopID);

    // Delete all of the audio packets
    storage.get(id).then((metaStr) => {
      const meta: CreateAudioMetadata = JSON.parse(metaStr);
      for (let i = 0; i < meta.nPackets; i++) {
        const packetID = getAudioID(req.sessionID, req.loopID, i);
        storage.del(packetID);
      }

      storage.del(id);
    });

    // Remove from the main sets
    storage.srem(`session-${req.sessionID}`, id);
    storage.srem(`session-playing-${req.sessionID}`, id);
  };

  // The following can be hit by anyone

  const listAudio = (sessionID: string): void => {
    storage.smembers(`session-${sessionID}`).then((audioIDs) => {
      socket.to(socket.id).emit(ROUTES.AUDIO_LIST_ROUTE, audioIDs);
    });
  };

  const playListAudio = (sessionID: string): void => {
    storage.smembers(`session-playing-${sessionID}`).then((audioIDs) => {
      socket.to(socket.id).emit(ROUTES.AUDIO_PLAY_LIST_ROUTE, audioIDs);
    });
  };

  const getAudioMeta = (req: AudioMetadata): void => {
    const id = getAudioID(req.sessionID, req.loopID);

    storage.get(id).then((metaStr) => {
      const meta: CreateAudioMetadata = JSON.parse(metaStr);
      socket.to(socket.id).emit(ROUTES.AUDIO_META_GET_ROUTE, meta);
    });
  };

  const getAudio = (req: AudioPacketMetadata): void => {
    const id = getAudioID(req.sessionID, req.loopID, req.packet);

    // Fetch the data and put it into the appropriate format
    storage.getBuffer(id).then((buff) => {
      const blob = new Blob([Uint8Array.from(buff).buffer]);
      const response: AudioPacket = {
        ...req,
        file: blob,
      };

      socket.to(socket.id).emit(ROUTES.AUDIO_SET_ROUTE, response);
    });
  };

  return {
    playAudio,
    stopAudio,
    createAudio,
    setAudio,
    deleteAudio,
    listAudio,
    playListAudio,
    getAudioMeta,
    getAudio,
  };
};

export default audioHandlers;

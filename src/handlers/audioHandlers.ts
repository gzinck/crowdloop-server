import { Server, Socket } from 'socket.io';
import Storage from '../adapters/Storage';
import * as events from '../events';

const getAudioID = (sessionID: string, id: string, packet?: number): string => {
  return `audiofile-${sessionID}-${id}${packet !== undefined ? `-${packet}` : ''}`;
};

interface AudioMetadata {
  sessionID: string;
  loopID: string;
}

interface AudioPlayRequest extends AudioMetadata {
  startTime: number;
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

interface AudioPacketIdentifier extends AudioMetadata {
  packet: number;
}

interface PacketMetadata {
  head: number;
  length: number;
}

interface AudioPacket extends AudioPacketIdentifier {
  file: Uint8Array;
  meta: PacketMetadata;
}

/**
 * @param io the socket.io server
 * @param socket the socket connected at the moment
 * @param redis the regular redis client for storing strings
 * @param redisBuf the redis client for storing buffers
 */
const audioHandlers = (io: Server, socket: Socket, storage: Storage) => {
  // TODO add auth for the following endpoints
  const playAudio = (req: AudioPlayRequest) => {
    // TODO: consider what happens if someone makes a playListRequest. They will not
    // see the time each loop is supposed to start playing because they just see
    // that it is playing---it's in the set below. Consider leveraging the
    // startTime in the request above
    storage.sadd(`session-playing-${req.sessionID}`, req.loopID);
    io.to(req.sessionID).emit(events.AUDIO_PLAY, req);
  };

  const stopAudio = (req: AudioMetadata) => {
    storage.srem(`session-playing-${req.sessionID}`, req.loopID);
    io.to(req.sessionID).emit(events.AUDIO_STOP, req);
  };

  const createAudio = (meta: CreateAudioMetadata): void => {
    const id = getAudioID(meta.sessionID, meta.loopID);

    storage.set(id, JSON.stringify(meta));
    storage.sadd(`session-${meta.sessionID}`, id);
    storage.sadd(`session-playing-${meta.sessionID}`, id);

    // Publish the new audio data to the room
    io.to(meta.sessionID).emit(events.AUDIO_CREATE, meta);
  };

  const setAudio = (audio: AudioPacket): void => {
    const id = getAudioID(audio.sessionID, audio.loopID, audio.packet);

    // Serialize the data and save it
    storage.set(`${id}-meta`, JSON.stringify(audio.meta));
    storage.set(id, Buffer.from(audio.file));

    // Publish the new audio data to the room
    io.to(audio.sessionID).emit(events.AUDIO_SET, audio);
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
      socket.to(socket.id).emit(events.AUDIO_LIST, audioIDs);
    });
  };

  const playListAudio = (sessionID: string): void => {
    storage.smembers(`session-playing-${sessionID}`).then((audioIDs) => {
      socket.to(socket.id).emit(events.AUDIO_PLAY_LIST, audioIDs);
    });
  };

  const getAudioMeta = (req: AudioMetadata): void => {
    const id = getAudioID(req.sessionID, req.loopID);

    storage.get(id).then((metaStr) => {
      const meta: CreateAudioMetadata = JSON.parse(metaStr);
      socket.to(socket.id).emit(events.AUDIO_META_GET, meta);
    });
  };

  const getAudio = (req: AudioPacketIdentifier): void => {
    const id = getAudioID(req.sessionID, req.loopID, req.packet);

    // Fetch the data and put it into the appropriate format
    const metaPromise = storage.get(`${id}-meta`);
    const filePromise = storage.getBuffer(id)

    Promise.all([metaPromise, filePromise]).then(([metaStr, buff]) => {
      const meta: PacketMetadata = JSON.parse(metaStr);
      const file = Uint8Array.from(buff);
      const response: AudioPacket = {
        ...req,
        file,
        meta,
      };

      socket.to(socket.id).emit(events.AUDIO_SET, response);
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

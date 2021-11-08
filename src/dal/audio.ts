import Storage from '../adapters/Storage';
import Logger from '../adapters/Logger';
import {
  AudioID,
  AudioPacketID,
  AudioPlayRequest,
  CreateAudioRequest,
  AudioPacket,
  AudioPacketMetadata,
  MoveAudioRequest,
} from '../models/audio';

export interface AudioDAL {
  startPlaying: (req: AudioPlayRequest) => void;
  stopPlaying: (req: AudioID) => void;
  createAudio: (req: CreateAudioRequest) => void;
  setAudio: (req: AudioPacket) => void;
  move: (req: MoveAudioRequest) => void;
  deleteAudio: (req: AudioID) => void;
  deleteAll: (sessionID: string) => void;
  listAudio: (sessionID: string) => Promise<string[]>;
  getAudioMeta: (req: AudioID) => Promise<CreateAudioRequest>;
  getAudioPacket: (req: AudioPacketID) => Promise<AudioPacket>;
}

const getAudioID = (sessionID: string, id: string, packet?: number): string => {
  return `${sessionID}-audiofile-${id}${packet !== undefined ? `-${packet}` : ''}`;
};

const audioDAL = (storage: Storage): AudioDAL => {
  const startPlaying = (req: AudioPlayRequest): void => {
    getAudioMeta(req)
      .then((meta) => {
        meta.startAt = req.startTime;
        meta.isStopped = false;
        createAudio(meta);
      })
      .catch((err) => {
        Logger.error(`could not start loop ${req.loopID}: ${err}`);
      });
  };

  const stopPlaying = (req: AudioID): void => {
    getAudioMeta(req)
      .then((meta) => {
        meta.isStopped = true;
        createAudio(meta);
      })
      .catch((err) => {
        Logger.warning(`could not stop loop ${req.loopID} (the session probably closed): ${err}`);
      });
  };

  // NOTE: can be used to simply alter the metadata for the audio, too
  const createAudio = (req: CreateAudioRequest): void => {
    const id = getAudioID(req.sessionID, req.loopID);

    storage.set(id, JSON.stringify(req));
    storage.sadd(`${req.sessionID}-session`, req.loopID);
  };

  const setAudio = (req: AudioPacket): void => {
    const id = getAudioID(req.sessionID, req.loopID, req.packet);

    storage.set(`${id}-meta`, JSON.stringify(req.meta));
    storage.set(id, Buffer.from(req.file));
  };

  const move = (req: MoveAudioRequest): void => {
    getAudioMeta(req)
      .then((meta) => createAudio({ ...meta, ...req }))
      .catch((err) => {
        Logger.warning(`could not move loop ${req.loopID}: ${err}`);
      });
  };

  const getAudioMeta = (req: AudioID): Promise<CreateAudioRequest> => {
    const id = getAudioID(req.sessionID, req.loopID);
    // Delete all of the audio packets
    return storage.get(id).then((metaStr) => {
      const meta: CreateAudioRequest = JSON.parse(metaStr);
      return meta;
    });
  };

  const deleteAudio = (req: AudioID): void => {
    const id = getAudioID(req.sessionID, req.loopID);
    Logger.warning(`deleting ${id}`);
    getAudioMeta(req).then((meta) => {
      // Delete each audio packet and corresponding metadata
      for (let i = 0; i < meta.nPackets; i++) {
        const packetID = getAudioID(req.sessionID, req.loopID, i);
        storage.del(packetID);
        storage.del(`${packetID}-meta`);
      }

      // Delete the corresponding audio meta
      storage.del(id);
    });

    // Remove from the main sets
    storage.srem(`${req.sessionID}-session`, id);
  };

  const deleteAll = (sessionID: string): void => {
    listAudio(sessionID).then((ids) => {
      ids.forEach((loopID) => {
        deleteAudio({ loopID, sessionID });
      });

      // Delete the entire session
      storage.del(`${sessionID}-session`);
    });
  };

  const listAudio = (sessionID: string): Promise<string[]> => {
    return storage.smembers(`${sessionID}-session`);
  };

  const getAudioPacket = (req: AudioPacketID): Promise<AudioPacket> => {
    const id = getAudioID(req.sessionID, req.loopID, req.packet);

    // Fetch the data and put it into the appropriate format
    const metaPromise = storage.get(`${id}-meta`);
    const filePromise = storage.getBuffer(id);

    return Promise.all([metaPromise, filePromise]).then(([metaStr, buff]) => {
      const meta: AudioPacketMetadata = JSON.parse(metaStr);
      const packet: AudioPacket = {
        ...req,
        file: buff,
        meta,
      };

      return packet;
    });
  };

  return {
    startPlaying,
    stopPlaying,
    createAudio,
    setAudio,
    move,
    deleteAudio,
    deleteAll,
    listAudio,
    getAudioMeta,
    getAudioPacket,
  };
};

export default audioDAL;

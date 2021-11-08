import Storage from '../adapters/Storage';

export interface SessionDAL {
  setHost: (sessionID: string, host: string) => void;
  getHost: (sessionID: string) => Promise<string>;
  addToSession: (sessionID: string, socketID: string) => void;
  removeFromSession: (sessionID: string, socketID: string) => void;
  getSessionMembers: (sessionID: string) => Promise<string[]>;
  deleteSession: (sessionID: string) => void;
}

const getHostKey = (sessionID: string) => `${sessionID}-host`;

const sessionDAL = (storage: Storage): SessionDAL => {
  const setHost = (sessionID: string, host: string): void => {
    storage.set(getHostKey(sessionID), host);
  };

  const getHost = (sessionID: string): Promise<string> => {
    return storage.get(getHostKey(sessionID));
  };

  const addToSession = (sessionID: string, socketID: string): void => {
    storage.sadd(sessionID, socketID);
  };

  const removeFromSession = (sessionID: string, socketID: string): void => {
    storage.srem(sessionID, socketID);
  };

  const getSessionMembers = (sessionID: string): Promise<string[]> => {
    return storage.smembers(sessionID);
  };

  const deleteSession = (sessionID: string): void => {
    storage.del(sessionID);
  };

  return {
    setHost,
    getHost,
    addToSession,
    removeFromSession,
    getSessionMembers,
    deleteSession,
  };
};

export default sessionDAL;

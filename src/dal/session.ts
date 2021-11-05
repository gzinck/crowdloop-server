import Storage from '../adapters/Storage';

export interface SessionDAL {
  addToSession: (sessionID: string, socketID: string) => void;
  removeFromSession: (sessionID: string, socketID: string) => void;
  getSessionMembers: (sessionID: string) => Promise<string[]>;
  deleteSession: (sessionID: string) => void;
}

const sessionDAL = (storage: Storage): SessionDAL => {
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
    addToSession,
    removeFromSession,
    getSessionMembers,
    deleteSession,
  };
};

export default sessionDAL;

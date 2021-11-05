import Storage from '../adapters/Storage';

export interface SessionDAL {
  addToSession: (sessionID: string, socketID: string) => void;
  removeFromSession: (sessionID: string, socketID: string) => void;
  deleteSession: (sessionID: string) => void;
}

const sessionDAL = (storage: Storage): SessionDAL => {
  const addToSession = (sessionID: string, socketID: string): void => {
    storage.sadd(sessionID, socketID);
  };

  const removeFromSession = (sessionID: string, socketID: string): void => {
    storage.srem(sessionID, socketID);
  };

  const deleteSession = (sessionID: string): void => {
    storage.del(sessionID);
  };

  return {
    addToSession,
    removeFromSession,
    deleteSession,
  };
};

export default sessionDAL;

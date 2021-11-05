import Storage from '../adapters/Storage';

export interface ClockDAL {
  setHostDelta: (sessionID: string, delta: number) => void;
  getHostDelta: (sessionID: string) => Promise<number>;
  deleteClock: (sessionID: string) => void;
}

const getClockID = (sessionID: string) => `${sessionID}-clock`;

const clockDAL = (storage: Storage): ClockDAL => {
  const setHostDelta = (sessionID: string, delta: number): void => {
    storage.set(getClockID(sessionID), `${delta}`);
  };

  const getHostDelta = (sessionID: string): Promise<number> => {
    return storage.get(getClockID(sessionID)).then((data) => +data);
  };

  const deleteClock = (sessionID: string): void => {
    storage.del(getClockID(sessionID));
  };

  return {
    setHostDelta,
    getHostDelta,
    deleteClock,
  };
};

export default clockDAL;

import Storage from '../adapters/Storage';
import { AudiencePos } from '../models/audience';

export interface AudienceDAL {
  setPosition: (pos: AudiencePos) => void;
  deletePosition: (...socketIDs: string[]) => void;
  listPositions: (socketIDs: string[]) => Promise<AudiencePos[]>;
}

const getKey = (socketID: string): string => `audience-pos-${socketID}`;

const audienceDAL = (storage: Storage): AudienceDAL => {
  const setPosition = (pos: AudiencePos): void => {
    storage.set(getKey(pos.id), JSON.stringify(pos));
  };

  const deletePosition = (...socketIDs: string[]): void => {
    const keys = socketIDs.map((id) => getKey(id));
    storage.del(...keys);
  };

  const listPositions = (socketIDs: string[]): Promise<AudiencePos[]> => {
    const keys = socketIDs.map((id) => getKey(id));
    return storage.getAll(keys).then((positions) => {
      return positions.map<AudiencePos>((pos) => JSON.parse(pos));
    });
  };

  return {
    setPosition,
    deletePosition,
    listPositions,
  };
};

export default audienceDAL;

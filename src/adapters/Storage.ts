import Store, { Redis } from 'ioredis';

class Storage {
  private readonly store: Redis;

  constructor() {
    this.store = new Store();
  }

  public sadd(key: string, value: string) {
    return this.store.sadd(key, value);
  }

  public srem(key: string, value: string) {
    return this.store.srem(key, value);
  }

  public smembers(key: string): Promise<string[]> {
    return this.store.smembers(key);
  }

  public set(key: string, value: string | Buffer) {
    return this.store.set(key, value);
  }

  public get(key: string): Promise<string> {
    return this.store.get(key);
  }

  public getAll(keys: string[]): Promise<string[]> {
    return this.store.mget(keys);
  }

  public del(...keys: string[]) {
    return this.store.del(keys);
  }

  public getBuffer(key: string): Promise<Buffer> {
    return this.store.getBuffer(key);
  }
}

export default Storage;

import cp from 'child_process';

const combineBuffers = (...buffs: Buffer[]): Uint8Array => {
  const length = buffs.reduce((acc, buff) => acc + buff.byteLength, 0);
  const result = new Uint8Array(length);

  let startAt = 0;
  buffs.forEach((buff) => {
    const currLength = buff.byteLength;
    result.set(buff, startAt);
    startAt += currLength;
  });

  return result;
};

export const convertToAAC = (buff: Buffer): Promise<Uint8Array> => {
  return new Promise<Uint8Array>((resolve) => {
    const proc = cp.spawn('ffmpeg', [
      '-hide_banner',
      '-i',
      '-',
      '-c:a',
      'aac',
      '-f',
      'mp4',
      '-movflags',
      'frag_keyframe+empty_moov',
      'pipe:1',
    ]);
    const buffers: Buffer[] = [];

    proc.stdin.write(buff);
    proc.stdin.end();
    proc.stdout.on('data', (chunk) => {
      buffers.push(chunk);
      console.log(chunk);
    });
    proc.stdout.on('end', () => {
      resolve(combineBuffers(...buffers));
    });
  });
};

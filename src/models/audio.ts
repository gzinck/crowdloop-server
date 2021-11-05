export interface AudioID {
  sessionID: string;
  loopID: string;
}

export interface AudioPlayRequest extends AudioID {
  startTime: number;
}

export interface CreateAudioRequest extends AudioID {
  startAt: number;
  nPackets: number;
  bpbar: number; // beats per bar
  bpm: number; // beats per minute
  nBars: number; // number of bars in new loops
  isStopped?: boolean;
}

export interface AudioPacketID extends AudioID {
  packet: number;
}

export interface AudioPacketMetadata {
  head: number;
  length: number;
}

export interface AudioPacket extends AudioPacketID {
  file: ArrayBuffer;
  meta: AudioPacketMetadata;
}

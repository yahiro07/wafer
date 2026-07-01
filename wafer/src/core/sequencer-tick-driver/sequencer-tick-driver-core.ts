import { IAudioContext } from "../host-system/types";

export type SequencerTickDriverCoreCallbacks = {
  processScheduling(
    timeFrom: number, //absolute time based on AudioContext.currentTime
    barFrom: number, //decimal bar position in song
    barTo: number, //decimal bar position in song
    bpm: number,
  ): void;
};

export type SequencerTickDriverCore = {
  setBpm(bpm: number): void;
  start(sequencer: SequencerTickDriverCoreCallbacks): void;
  stop(): void;
};

function mapTimeToBar(timeSec: number, bpm: number): number {
  const minutes = timeSec / 60;
  const beats = minutes * bpm;
  return beats / 4;
}

export function createSequencerTickDriverCore(
  audioContext: IAudioContext,
  intervalMs: number = 25,
  lookaheadMs: number = 100,
  bpmOptions?: {
    min?: number;
    max?: number;
    default?: number;
  },
): SequencerTickDriverCore {
  const state = { bpm: bpmOptions?.default ?? 120 };
  const lookaheadSec = lookaheadMs / 1000;

  let timerId: NodeJS.Timeout | null = null;

  return {
    setBpm(bpm: number) {
      const lowerBound = bpmOptions?.min ?? 10;
      const upperBound = bpmOptions?.max ?? 400;
      if (lowerBound <= bpm && bpm <= upperBound) {
        state.bpm = bpm;
      }
    },
    start(sequencer: SequencerTickDriverCoreCallbacks) {
      let scheduledUntil = audioContext.currentTime;
      let barPos = 0;

      function scheduleUntil(timeTo: number) {
        const timeFrom = scheduledUntil;
        const duration = timeTo - timeFrom;

        const barPosNext = barPos + mapTimeToBar(duration, state.bpm);
        sequencer.processScheduling(timeFrom, barPos, barPosNext, state.bpm);

        scheduledUntil = timeTo;
        barPos = barPosNext;
      }

      scheduleUntil(audioContext.currentTime + lookaheadSec);

      timerId = setInterval(() => {
        scheduleUntil(audioContext.currentTime + lookaheadSec);
      }, intervalMs);
    },
    stop() {
      if (timerId) {
        clearInterval(timerId);
        timerId = null;
      }
    },
  };
}

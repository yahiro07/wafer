export type SequencerCallbacks = {
  processScheduling(
    timeFrom: number, //absolute time based on AudioContext.currentTime
    barFrom: number, //decimal bar position in song
    barTo: number, //decimal bar position in song
    bpm: number,
  ): void;
};

export type SequencerTickDriver = {
  setBpm(bpm: number): void;
  start(sequencer: SequencerCallbacks): void;
  stop(): void;
};

function mapTimeToBar(timeSec: number, bpm: number): number {
  const minutes = timeSec / 60;
  const beats = minutes * bpm;
  return beats / 4;
}

export function createSequencerTickDriverCore(
  audioContext: AudioContext,
  intervalMs: number = 25,
  lookaheadMs: number = 100,
): SequencerTickDriver {
  const state = { bpm: 120 };
  const lookaheadSec = lookaheadMs / 1000;

  let timerId: NodeJS.Timeout | null = null;

  return {
    setBpm(bpm: number) {
      if (10 <= bpm && bpm <= 400) {
        state.bpm = bpm;
      }
    },
    start(sequencer: SequencerCallbacks) {
      // sequencer.handleStart?.();

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

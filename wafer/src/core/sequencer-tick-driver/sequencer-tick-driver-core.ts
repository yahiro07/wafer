export type SequencerTickDriverCoreCallbacks = {
  processPreScheduling?(
    timeFrom: number,
    barFrom: number,
    barTo: number,
    bpm: number,
  ): { barShifting?: number } | void;
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
  audioContext: AudioContext,
  intervalMs: number = 25,
  lookaheadMs: number = 100,
): SequencerTickDriverCore {
  const state = { bpm: 120 };
  const lookaheadSec = lookaheadMs / 1000;

  let timerId: NodeJS.Timeout | null = null;

  return {
    setBpm(bpm: number) {
      if (10 <= bpm && bpm <= 400) {
        state.bpm = bpm;
      }
    },
    start(sequencer: SequencerTickDriverCoreCallbacks) {
      // sequencer.handleStart?.();

      let scheduledUntil = audioContext.currentTime;
      let barPos = 0;

      function scheduleUntil(timeTo: number) {
        const timeFrom = scheduledUntil;
        const duration = timeTo - timeFrom;

        let barPosNext = barPos + mapTimeToBar(duration, state.bpm);
        const res = sequencer.processPreScheduling?.(
          timeFrom,
          barPos,
          barPosNext,
          state.bpm,
        );
        if (res?.barShifting) {
          barPos += res.barShifting;
          barPosNext += res.barShifting;
        }
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

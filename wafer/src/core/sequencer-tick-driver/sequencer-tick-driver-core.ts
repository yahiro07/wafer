export type SequencerCallbacks = {
  processScheduling(
    startTime: number, //the value of audioContext.currentTime when playback started
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

function callSequencerScheduling(
  sequencer: SequencerCallbacks,
  startTime: number,
  timeFrom: number,
  timeTo: number,
  bpm: number,
) {
  const barFrom = mapTimeToBar(timeFrom, bpm);
  const barTo = mapTimeToBar(timeTo, bpm);
  sequencer.processScheduling(startTime, barFrom, barTo, bpm);
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
      state.bpm = bpm;
    },
    start(sequencer: SequencerCallbacks) {
      const startTime = audioContext.currentTime;
      // sequencer.handleStart?.();

      const getRelativeTime = () => audioContext.currentTime - startTime;

      let timePos = 0;
      {
        const timePosNext = lookaheadSec;
        callSequencerScheduling(
          sequencer,
          startTime,
          timePos,
          timePosNext,
          state.bpm,
        );
        timePos = timePosNext;
      }
      timerId = setInterval(() => {
        const relativeTime = getRelativeTime();
        const timePosNext = relativeTime + lookaheadSec;
        callSequencerScheduling(
          sequencer,
          startTime,
          timePos,
          timePosNext,
          state.bpm,
        );
        timePos = timePosNext;
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

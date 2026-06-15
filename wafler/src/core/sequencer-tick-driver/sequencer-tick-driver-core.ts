export type SequencerCallbacks = {
  //480ppq based
  processScheduling(
    startTime: number,
    ppqFrom: number,
    ppqTo: number,
    bpm: number,
  ): void;
};

export type SequencerTickDriver = {
  setBpm(bpm: number): void;
  start(sequencer: SequencerCallbacks): void;
  stop(): void;
};

function mapTimeToPpq(timeSec: number, bpm: number): number {
  const minutes = timeSec / 60;
  const beats = minutes * bpm;
  const ppq = beats * 480;
  return ppq;
}

function callSequencerScheduling(
  sequencer: SequencerCallbacks,
  startTime: number,
  timeFrom: number,
  timeTo: number,
  bpm: number,
) {
  const ppqFrom = mapTimeToPpq(timeFrom, bpm);
  const ppqTo = mapTimeToPpq(timeTo, bpm);
  sequencer.processScheduling(startTime, ppqFrom, ppqTo, bpm);
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

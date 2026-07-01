import { useEffect } from "react";

export type ISequencerTickDriver = {
  setBpm(bpm: number): void;
  start(): void;
  stop(): void;
};

export function createSequencerTickDriverDummy(): ISequencerTickDriver {
  return {
    setBpm: () => {},
    start: () => {},
    stop: () => {},
  };
}

export function useSequencerTickDriverRunner({
  sequencerTickDriver,
  playing = false,
  bpm,
}: {
  sequencerTickDriver: ISequencerTickDriver;
  playing?: boolean;
  bpm?: number;
}) {
  useEffect(() => {
    if (bpm) {
      sequencerTickDriver.setBpm(bpm);
    }
  }, [sequencerTickDriver, bpm]);
  useEffect(() => {
    if (playing) {
      sequencerTickDriver.start();
      return () => sequencerTickDriver.stop();
    } else {
      sequencerTickDriver.stop();
    }
  }, [sequencerTickDriver, playing]);
}

export const SequencerTickDriverRunner = ({
  sequencerTickDriver,
  playing = false,
  bpm,
}: {
  sequencerTickDriver: ISequencerTickDriver;
  playing?: boolean;
  bpm?: number;
}) => {
  useSequencerTickDriverRunner({
    sequencerTickDriver,
    playing,
    bpm,
  });
  return null;
};

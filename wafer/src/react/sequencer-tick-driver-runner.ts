import { useEffect } from "react";
import { ISequencerTickDriver } from "../core";

export function useSequencerTickDriverRunner({
  sequencerTickDriver,
  playing = false,
  bpm,
}: {
  sequencerTickDriver: ISequencerTickDriver | undefined;
  playing?: boolean;
  bpm?: number;
}) {
  useEffect(() => {
    if (bpm) {
      sequencerTickDriver?.setBpm(bpm);
    }
  }, [sequencerTickDriver, bpm]);
  useEffect(() => {
    if (playing) {
      sequencerTickDriver?.start();
      return () => sequencerTickDriver?.stop();
    } else {
      sequencerTickDriver?.stop();
    }
  }, [sequencerTickDriver, playing]);
}

import { oxLogger } from "../host-system/orchestration-logger";
import { HostSystem } from "../host-system/types";
import { createSequencerTickDriverCore } from "./sequencer-tick-driver-core";
import { sequencerTickDriverHelper } from "./sequencer-tick-driver-helper";

export type ISequencerTickDriver = {
  setBpm(bpm: number): void;
  start(): void;
  stop(): void;
};

//this is a default implementation for general use
//if you want to do advanced control, you can create your own implementation
export function createSequencerTickDriver(
  hostSystem: HostSystem,
): ISequencerTickDriver {
  const { processUnitsStartStop, processUnitsScheduling } =
    sequencerTickDriverHelper;
  const core = createSequencerTickDriverCore(hostSystem.audioContext, 25, 100);
  const getAllUnits = hostSystem.getAllUnits;
  let frameIndex = 0;

  return {
    setBpm: core.setBpm,
    start() {
      oxLogger.clockingStart();
      frameIndex = 0;
      processUnitsStartStop(getAllUnits(), "start");
      core.start({
        processScheduling(timeFrom, barFrom, barTo, bpm) {
          oxLogger.clockingFrameStart(frameIndex);
          processUnitsScheduling(getAllUnits(), timeFrom, barFrom, barTo, bpm);
          oxLogger.clockingFrameEnd(frameIndex);
          frameIndex += 1;
        },
      });
    },
    stop() {
      core.stop();
      processUnitsStartStop(getAllUnits(), "stop");
      oxLogger.clockingStop();
    },
  };
}

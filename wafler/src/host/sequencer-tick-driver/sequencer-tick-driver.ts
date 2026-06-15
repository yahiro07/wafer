import { HostSystem } from "../core/host-system";
import { HsUnitInstance } from "../linkage/types";
import { createSequencerTickDriverCore } from "./sequencer-tick-driver-core";

type SequencerTickDriver = {
  setBpm(bpm: number): void;
  start(): void;
  stop(): void;
};

type CrossingStepInfo = {
  stepIndex: number;
  time: number;
};

function getCrossingStepIndices(
  startTime: number,
  ppqFrom: number,
  ppqTo: number,
  bpm: number,
): CrossingStepInfo[] {
  const ppqPerStep = 120;
  const stepFrom = Math.floor(ppqFrom / ppqPerStep);
  const stepTo = Math.floor(ppqTo / ppqPerStep);
  const crossingStepInfos: CrossingStepInfo[] = [];
  const stepDurationSec = ppqPerStep / ((480 * bpm) / 60);
  if (ppqFrom === 0) {
    crossingStepInfos.push({
      stepIndex: 0,
      time: startTime,
    });
  }
  for (let stepIndex = stepFrom + 1; stepIndex <= stepTo; stepIndex++) {
    crossingStepInfos.push({
      stepIndex,
      time: startTime + stepIndex * stepDurationSec,
    });
  }
  return crossingStepInfos;
}

function processAllUnitsStartStop(
  hostSystem: HostSystem,
  method: "start" | "stop",
) {
  const units = hostSystem.getAllUnits();
  for (const unit of units) {
    unit.clockHandlers?.[method]?.();
  }
}

function processUnitsScheduling(
  units: HsUnitInstance[],
  startTime: number,
  ppqFrom: number,
  ppqTo: number,
  bpm: number,
  crossingStepInfos: CrossingStepInfo[],
) {
  const unitStepDurationSec = 60 / bpm / 4;
  for (const crossingStepIndex of crossingStepInfos) {
    for (const unit of units) {
      unit.clockHandlers?.processStep?.(
        crossingStepIndex.stepIndex,
        crossingStepIndex.time,
        unitStepDurationSec,
      );
    }
  }
  for (const unit of units) {
    unit.clockHandlers?.processScheduling?.(startTime, ppqFrom, ppqTo, bpm);
  }
}

function processAllUnitsScheduling(
  hostSystem: HostSystem,
  startTime: number,
  ppqFrom: number,
  ppqTo: number,
  bpm: number,
) {
  const crossingStepInfos = getCrossingStepIndices(
    startTime,
    ppqFrom,
    ppqTo,
    bpm,
  );
  const units = hostSystem.getAllUnits();

  const priorityUnits = units.filter(
    (unit) => unit.clockHandlers?.preferSchedulingOrderInPriority,
  );
  const normalUnits = units.filter(
    (unit) => !unit.clockHandlers?.preferSchedulingOrderInPriority,
  );
  processUnitsScheduling(
    priorityUnits,
    startTime,
    ppqFrom,
    ppqTo,
    bpm,
    crossingStepInfos,
  );
  processUnitsScheduling(
    normalUnits,
    startTime,
    ppqFrom,
    ppqTo,
    bpm,
    crossingStepInfos,
  );
}

export function createSequencerTickDriver(
  hostSystem: HostSystem,
): SequencerTickDriver {
  const core = createSequencerTickDriverCore(hostSystem.audioContext, 25, 100);
  let tickFrameIndex = 0;

  return {
    setBpm: core.setBpm,
    start() {
      tickFrameIndex = 0;
      processAllUnitsStartStop(hostSystem, "start");
      core.start({
        processScheduling(startTime, ppqFrom, ppqTo, bpm) {
          if (0) {
            console.log("host tick", tickFrameIndex);
          }
          processAllUnitsScheduling(hostSystem, startTime, ppqFrom, ppqTo, bpm);
          tickFrameIndex++;
        },
      });
    },
    stop() {
      core.stop();
      processAllUnitsStartStop(hostSystem, "stop");
    },
  };
}

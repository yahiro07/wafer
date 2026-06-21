import { HostStateBus } from "../host-system/host-state-bus";
import { HsUnitInstance } from "../linkage/types";
import { createSequencerTickDriverCore } from "./sequencer-tick-driver-core";

export type SequencerTickDriver = {
  setBpm(bpm: number): void;
  start(): void;
  stop(): void;
  getCurrentBarPosition(): number;
  setBarSwitchingCallbackOnce(nextBar: number, fn: () => void): void;
  cancelBarSwitchingCallback(): void;
};

type CrossingStepInfo = {
  stepIndex: number;
  time: number;
};

function getCrossingStepIndices(
  timeFrom: number,
  barFrom: number,
  barTo: number,
  bpm: number,
): CrossingStepInfo[] {
  const stepsPerBar = 16;
  const stepFrom = Math.floor(barFrom * stepsPerBar);
  const stepTo = Math.floor(barTo * stepsPerBar);
  const crossingStepInfos: CrossingStepInfo[] = [];
  const stepDurationSec = 60 / bpm / 4;
  if (barFrom === 0) {
    crossingStepInfos.push({ stepIndex: 0, time: timeFrom });
  }
  for (let stepIndex = stepFrom + 1; stepIndex <= stepTo; stepIndex++) {
    const time = timeFrom + (stepIndex - barFrom * 16) * stepDurationSec;
    crossingStepInfos.push({ stepIndex, time });
  }
  return crossingStepInfos;
}

function processAllUnitsStartStop(
  hostStateBus: HostStateBus,
  method: "start" | "stop",
) {
  const units = hostStateBus.getAllUnits();
  for (const unit of units) {
    unit.clockHandlers?.[method]?.();
  }
}

function processUnitsScheduling(
  units: HsUnitInstance[],
  timeFrom: number,
  barFrom: number,
  barTo: number,
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
    unit.clockHandlers?.processScheduling?.(timeFrom, barFrom, barTo, bpm);
  }
}

function processAllUnitsScheduling(
  hostStateBus: HostStateBus,
  timeFrom: number,
  barFrom: number,
  barTo: number,
  bpm: number,
) {
  const crossingStepInfos = getCrossingStepIndices(
    timeFrom,
    barFrom,
    barTo,
    bpm,
  );
  const units = hostStateBus.getAllUnits().filter((unit) => unit.isClockingOn);

  const priorityUnits = units.filter(
    (unit) => unit.clockHandlers?.preferSchedulingOrderInPriority,
  );
  const normalUnits = units.filter(
    (unit) => !unit.clockHandlers?.preferSchedulingOrderInPriority,
  );
  processUnitsScheduling(
    priorityUnits,
    timeFrom,
    barFrom,
    barTo,
    bpm,
    crossingStepInfos,
  );
  processUnitsScheduling(
    normalUnits,
    timeFrom,
    barFrom,
    barTo,
    bpm,
    crossingStepInfos,
  );
}

type BarCallbackSpec = {
  nextBar: number;
  fn: () => void;
};

export function createSequencerTickDriver(
  hostStateBus: HostStateBus,
): SequencerTickDriver {
  const core = createSequencerTickDriverCore(
    hostStateBus.audioContext,
    25,
    100,
  );
  let tickFrameIndex = 0;
  let currentBarPosition = 0;
  let barCallbackSpec: BarCallbackSpec | undefined;

  return {
    setBpm: core.setBpm,
    start() {
      tickFrameIndex = 0;
      processAllUnitsStartStop(hostStateBus, "start");
      core.start({
        processScheduling(timeFrom, barFrom, barTo, bpm) {
          if (0) {
            console.log("host tick", tickFrameIndex);
          }
          //if next scheduling span includes the head point of the waiting bar, invoke the callback
          if (barCallbackSpec && barTo > barCallbackSpec.nextBar) {
            barCallbackSpec.fn();
            barCallbackSpec = undefined;
          }
          processAllUnitsScheduling(
            hostStateBus,
            timeFrom,
            barFrom,
            barTo,
            bpm,
          );
          tickFrameIndex++;
          currentBarPosition = barFrom;
        },
      });
    },
    stop() {
      core.stop();
      processAllUnitsStartStop(hostStateBus, "stop");
    },
    getCurrentBarPosition() {
      return currentBarPosition;
    },
    setBarSwitchingCallbackOnce(nextBar, fn) {
      barCallbackSpec = { nextBar, fn };
    },
    cancelBarSwitchingCallback() {
      barCallbackSpec = undefined;
    },
  };
}

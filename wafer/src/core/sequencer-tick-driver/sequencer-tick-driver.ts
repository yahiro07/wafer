import { HostSystem } from "../host-system/host-system";
import { HsUnitInstance } from "../linkage/types";
import { createSequencerTickDriverCore } from "./sequencer-tick-driver-core";

export type BarSwitchingCallbackFn = () => { nextBar: number } | void;

export type SequencerTickDriver = {
  setBpm(bpm: number): void;
  start(): void;
  stop(): void;
  getCurrentBarPosition(): number;
  setBarSwitchingCallbackOnce(barAt: number, fn: BarSwitchingCallbackFn): void;
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
  hostSystem: HostSystem,
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
  const units = hostSystem.getAllUnits().filter((unit) => unit.isClockingOn);

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
  barAt: number;
  fn: BarSwitchingCallbackFn;
};

export function createSequencerTickDriver(
  hostSystem: HostSystem,
): SequencerTickDriver {
  const core = createSequencerTickDriverCore(hostSystem.audioContext, 25, 100);
  let tickFrameIndex = 0;
  let currentBarPosition = 0;
  let barCallbackSpec: BarCallbackSpec | undefined;

  return {
    setBpm: core.setBpm,
    start() {
      tickFrameIndex = 0;
      processAllUnitsStartStop(hostSystem, "start");
      core.start({
        processPreScheduling(_timeFrom, _barFrom, barTo, _bpm) {
          if (0) {
            console.log("host tick", tickFrameIndex);
          }
          //if next scheduling span includes the head point of the waiting bar, invoke the callback
          if (barCallbackSpec && barTo > barCallbackSpec.barAt) {
            const res = barCallbackSpec.fn();
            if (res?.nextBar) {
              const barShifting = res.nextBar - barCallbackSpec.barAt;
              barCallbackSpec = undefined;
              return { barShifting: barShifting };
            }
          }
        },
        processScheduling(timeFrom, barFrom, barTo, bpm) {
          processAllUnitsScheduling(hostSystem, timeFrom, barFrom, barTo, bpm);
          tickFrameIndex++;
          currentBarPosition = barTo;
        },
      });
    },
    stop() {
      core.stop();
      processAllUnitsStartStop(hostSystem, "stop");
    },
    getCurrentBarPosition() {
      return currentBarPosition;
    },
    setBarSwitchingCallbackOnce(barAt, fn) {
      barCallbackSpec = { barAt, fn };
    },
    cancelBarSwitchingCallback() {
      barCallbackSpec = undefined;
    },
  };
}

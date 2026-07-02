import { HsUnitInstance } from "../linkage/types";

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

function processUnitsSchedulingCore(
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

function processUnitsStartStop(
  units: HsUnitInstance[],
  method: "start" | "stop",
) {
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
) {
  const crossingStepInfos = getCrossingStepIndices(
    timeFrom,
    barFrom,
    barTo,
    bpm,
  );
  processUnitsSchedulingCore(
    units,
    timeFrom,
    barFrom,
    barTo,
    bpm,
    crossingStepInfos,
  );
}

export const sequencerTickDriverHelper = {
  processUnitsStartStop,
  processUnitsScheduling,
};

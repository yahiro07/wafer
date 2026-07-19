import { delayMs } from "../../utils/timer-utils";
import { HsUnitStateData } from "../linkage/types";
import { createUnitLinkageManager } from "../linkage/unit-linkage-manager";
import { createHostSystemCore } from "./host-system-core";
import {
  HostSystem,
  HostSystemCore,
  IAudioContext,
  UnitLinkageManager,
} from "./types";
import {
  createUnitPersistenceHandlers,
  unitStateOperations,
} from "./unit-persistence";
import {
  createDummyActionScheduler,
  createWebAudioActionScheduler,
  WebAudioActionScheduler,
} from "./webaudio-action-scheduler";

export function createHostSystem(
  audioContext: IAudioContext,
  options?: {
    hostSystemCore?: HostSystemCore;
    customActionScheduler?: WebAudioActionScheduler | "none";
    linkageManager?: UnitLinkageManager;
  },
): HostSystem {
  let actionScheduler: WebAudioActionScheduler;
  if (options?.customActionScheduler === "none") {
    actionScheduler = createDummyActionScheduler();
  } else if (options?.customActionScheduler) {
    actionScheduler = options.customActionScheduler;
  } else {
    actionScheduler = createWebAudioActionScheduler(audioContext);
  }
  const hostSystemCore =
    options?.hostSystemCore ??
    createHostSystemCore(audioContext, actionScheduler);
  const { bus, loadingManager } = hostSystemCore;

  const unitPersistenceHandlers = createUnitPersistenceHandlers(bus);

  const linkageManager =
    options?.linkageManager ?? createUnitLinkageManager(hostSystemCore);

  const noteNumberToUnitIdMap = new Map<number, string>();

  const unsubscribeInternalEvents = bus.eventPort.subscribe((e) => {
    if (e.type === "beforeRemoveUnit") {
      linkageManager.onUnitRemoving(e.unitInstance.unitId);
    }
  });

  return {
    audioContext,
    eventPort: bus.eventPort,
    getAllUnits: bus.getAllUnits,
    setMasterGain(gain) {
      bus.masterGainNode.gain.linearRampToValueAtTime(
        gain,
        audioContext.currentTime + 0.01,
      );
    },
    getAllUnitStates() {
      return unitPersistenceHandlers.exportUnitStates();
    },
    setAllUnitStates(unitStates: HsUnitStateData[]) {
      unitPersistenceHandlers.importUnitStates(unitStates);
    },
    emitMetaAttributes(attributes) {
      hostSystemCore.emitMetaAttributes(attributes);
    },
    getUnitState(unitId: string) {
      const unit = bus.getUnit(unitId);
      return unit ? unitStateOperations.readStateFromUnit(unit) : undefined;
    },
    setUnitState(unitId: string, state: HsUnitStateData) {
      const unit = bus.getUnit(unitId);
      unit && unitStateOperations.applyStateToUnit(unit, state);
    },
    async waitUnitsLoaded() {
      await delayMs(100); //wait for iframes to be mounted in dom
      await new Promise<void>((resolve) => {
        loadingManager.reserveUnitOperation({
          type: "state",
          op: () => resolve(),
        });
      });
    },
    deliverNote({ destUnitId, noteNumber, isOn, time, velocity }) {
      if (isOn) {
        const unit = bus.getUnit(destUnitId);
        const noteOnFn = unit?.primaryInputPorts.noteInput?.noteOn;
        if (noteOnFn) {
          actionScheduler.pushAction(
            () => noteOnFn(noteNumber, time, velocity),
            time,
          );
        }
        noteNumberToUnitIdMap.set(noteNumber, destUnitId);
      } else {
        const unitId = noteNumberToUnitIdMap.get(noteNumber);
        if (unitId) {
          const unit = bus.getUnit(unitId);
          const noteOffFn = unit?.primaryInputPorts.noteInput?.noteOff;
          if (noteOffFn) {
            actionScheduler.pushAction(() => noteOffFn(noteNumber, time), time);
          }
        }
        noteNumberToUnitIdMap.delete(noteNumber);
      }
    },
    cleanup() {
      unsubscribeInternalEvents();
    },
    setUnitNoteOutputMonitor(monitorFn) {
      hostSystemCore.setUnitNoteOutputMonitor(monitorFn);
    },
    linkageApi: linkageManager,
  };
}

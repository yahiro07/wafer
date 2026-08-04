import { delayMs } from "../../utils/timer-utils";
import { createLinkageApi } from "../linkage/linkage-api";
import { HsUnitStateData } from "../linkage/types";
import { createUnitLinkageManager } from "../linkage/unit-linkage-manager";
import { createHostSystemCore } from "./host-system-core";
import { createNotesDispatcher } from "./notes-dispatcher";
import {
  HostSystem,
  HostSystemCore,
  IAudioContext,
  NotesDispatcher,
  UnitLinkageManager,
} from "./types";
import {
  createUnitPersistenceHandlers,
  unitStateOperations,
} from "./unit-persistence";

export function createHostSystem(
  audioContext: IAudioContext,
  options?: {
    hostSystemCore?: HostSystemCore;
    // customActionScheduler?: WebAudioActionScheduler | "none";
    customNotesDispatcher?: NotesDispatcher;
    linkageManager?: UnitLinkageManager;
  },
): HostSystem {
  // let actionScheduler: WebAudioActionScheduler;
  // if (options?.customActionScheduler === "none") {
  //   actionScheduler = createDummyActionScheduler();
  // } else if (options?.customActionScheduler) {
  //   actionScheduler = options.customActionScheduler;
  // } else {
  //   actionScheduler = createWebAudioActionScheduler(audioContext);
  // }
  const hostSystemCore =
    options?.hostSystemCore ?? createHostSystemCore(audioContext);
  const notesDispatcher =
    options?.customNotesDispatcher ?? createNotesDispatcher(hostSystemCore);

  const { bus } = hostSystemCore;

  const unitPersistenceHandlers = createUnitPersistenceHandlers(bus);

  const linkageManager =
    options?.linkageManager ?? createUnitLinkageManager(hostSystemCore);

  const linkageApi = createLinkageApi(hostSystemCore, notesDispatcher);

  // const noteNumberToUnitIdMap = new Map<number, string>();

  const unsubscribeInternalEvents = bus.eventPort.subscribe((e) => {
    if (e.type === "beforeRemoveUnit") {
      // linkageManager.onUnitRemoving(e.unitInstance.unitId);
    }
  });

  async function waitPendingUnitsLoaded(): Promise<void> {
    if (bus.getUnitLoadingIds().size === 0) return;
    await new Promise<void>((resolve) => {
      const unsubscribe = bus.internalEventPort.subscribe((ev) => {
        if (ev.type === "pendingUnitsLoaded") {
          unsubscribe();
          resolve();
        }
      });
    });
  }

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
      if (unit) {
        unitStateOperations.applyStateToUnit(unit, state);
      }
    },
    async waitUnitsLoaded() {
      await delayMs(200); //wait for iframes to be mounted in dom
      await waitPendingUnitsLoaded();
    },
    deliverNote({ destUnitId, noteNumber, isOn, time, velocity }) {
      notesDispatcher.pushNoteDeliveryEvent({
        destPortKey: `${destUnitId}.noteInput`,
        noteNumber,
        isOn,
        time,
        velocity,
      });
      // if (isOn) {
      //   const unit = bus.getUnit(destUnitId);
      //   const noteOnFn = unit?.primaryInputPorts.noteInput?.noteOn;
      //   if (noteOnFn) {
      //     // actionScheduler.pushAction(
      //     //   () => noteOnFn(noteNumber, time, velocity),
      //     //   time,
      //     // );
      //     notesDispatcher.pushNoteDeliveryEvent({
      //       destPortKey: `${destUnitId}.noteInput`,
      //       noteNumber,
      //       isOn,
      //       time,
      //       velocity,
      //     });
      //   }
      //   noteNumberToUnitIdMap.set(noteNumber, destUnitId);
      // } else {
      //   const unitId = noteNumberToUnitIdMap.get(noteNumber);
      //   if (unitId) {
      //     const unit = bus.getUnit(unitId);
      //     const noteOffFn = unit?.primaryInputPorts.noteInput?.noteOff;
      //     if (noteOffFn) {
      //       // actionScheduler.pushAction(() => noteOffFn(noteNumber, time), time);
      //       notesDispatcher.pushNoteDeliveryEvent({
      //         destPortKey: `${destUnitId}.noteInput`,
      //         noteNumber,
      //         isOn,
      //         time,
      //       });
      //     }
      //   }
      //   noteNumberToUnitIdMap.delete(noteNumber);
      // }
    },
    cleanup() {
      linkageManager.cleanup();
      unsubscribeInternalEvents();
    },
    setUnitNoteOutputMonitor(monitorFn) {
      notesDispatcher.setUnitNoteOutputMonitor(monitorFn);
    },
    linkageApi,
  };
}

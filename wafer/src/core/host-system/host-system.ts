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
    customNotesDispatcher?: NotesDispatcher;
    linkageManager?: UnitLinkageManager;
  },
): HostSystem {
  const hostSystemCore =
    options?.hostSystemCore ?? createHostSystemCore(audioContext);
  const { bus } = hostSystemCore;
  const notesDispatcher =
    options?.customNotesDispatcher ?? createNotesDispatcher(hostSystemCore);
  const unitPersistenceHandlers = createUnitPersistenceHandlers(bus);
  const linkageManager =
    options?.linkageManager ?? createUnitLinkageManager(hostSystemCore);
  const linkageApi = createLinkageApi(hostSystemCore, notesDispatcher);

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
    },
    cleanup() {
      linkageManager.cleanup();
    },
    setUnitNoteOutputMonitor(monitorFn) {
      notesDispatcher.setUnitNoteOutputMonitor(monitorFn);
    },
    linkageApi,
  };
}

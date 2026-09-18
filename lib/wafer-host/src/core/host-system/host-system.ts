import { delayMs } from "../../utils/timer-utils";
import { createLinkageApi } from "../linkage/linkage-api";
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
  audioContext?: IAudioContext,
  options?: {
    hostSystemCore?: HostSystemCore;
    customNotesDispatcher?: NotesDispatcher;
    linkageManager?: UnitLinkageManager;
  },
): HostSystem {
  audioContext ??= new AudioContext();
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
    getConnectionRules: bus.getConnectionRules,
    setMasterGain(gain) {
      bus.masterGainNode.gain.linearRampToValueAtTime(
        gain,
        audioContext.currentTime + 0.01,
      );
    },
    getAllUnitStates() {
      return unitPersistenceHandlers.exportUnitStates();
    },
    setAllUnitStates(unitStates) {
      unitPersistenceHandlers.importUnitStates(unitStates);
    },
    emitMetaAttributes(attributes) {
      hostSystemCore.emitMetaAttributes(attributes);
    },
    sendMessageToUnit(unitId, message) {
      const unit = bus.getUnit(unitId);
      if (unit) {
        return unit.unitCallbacks?.onMessageFromHost?.(message);
      }
      return undefined;
    },
    getUnitState(unitId) {
      const unit = bus.getUnit(unitId);
      return unit ? unitStateOperations.readStateFromUnit(unit) : undefined;
    },
    setUnitState(unitId, state) {
      const unit = bus.getUnit(unitId);
      if (unit) {
        unitStateOperations.applyStateToUnit(unit, state);
      } else {
        console.warn(`unit not found when applying state for ${unitId}`);
      }
    },
    async waitUnitsLoaded() {
      await delayMs(200); //wait for iframes to be mounted in dom
      await waitPendingUnitsLoaded();
    },
    deliverNote({ destUnitId, noteNumber, isOn, time, attrs }) {
      notesDispatcher.pushNoteDeliveryEvent({
        destPortKey: `${destUnitId}.noteInput`,
        noteNumber,
        isOn,
        time,
        attrs,
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

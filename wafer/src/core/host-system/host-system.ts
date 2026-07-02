import { MetaAttributes } from "../../unit-types";
import { EventPort } from "../../utils/event-port";
import { delayMs } from "../../utils/timer-utils";
import { createUnitConnectionsManager } from "../linkage/connection-manager";
import {
  DestinationCode,
  HsUnitInstance,
  HsUnitStateData,
} from "../linkage/types";
import { createHostStateBus, HostSystemEvent } from "./host-state-bus";
import { IAudioContext, UnitNoteOutputMonitorFn } from "./types";
import { createUnitsLoadingManager } from "./unit-loading-manager";
import {
  createUnitPersistenceHandlers,
  unitStateOperations,
} from "./unit-persistence";
import {
  createDummyActionScheduler,
  createWebAudioActionScheduler,
  WebAudioActionScheduler,
} from "./webaudio-action-scheduler";

export type HostSystem = {
  audioContext: IAudioContext;
  actionScheduler: WebAudioActionScheduler;
  setCustomActionScheduler(
    customActionScheduler: WebAudioActionScheduler | "none",
  ): void;
  getAllUnits(): HsUnitInstance[];
  eventPort: EventPort<HostSystemEvent>;
  registerUnitInstance(unit: HsUnitInstance): () => void;
  registerPendingUnitInstancePromise(
    unitId: string,
    unitInstancePromise: Promise<HsUnitInstance>,
  ): () => void;
  reserveConnectionChange(
    srcUnitId: string,
    destSpec: DestinationCode | undefined,
  ): void;
  setMasterGain(gain: number): void;
  emitMetaAttributes(attributes: MetaAttributes): void;
  getUnitState(unitId: string): HsUnitStateData | undefined;
  setUnitState(unitId: string, state: HsUnitStateData): void;
  getAllUnitStates(): HsUnitStateData[];
  setAllUnitStates(unitStates: HsUnitStateData[]): void;
  waitUnitsLoaded(): Promise<void>;
  deliverNote(args: {
    destUnitId: string;
    noteNumber: number;
    isOn: boolean;
    time?: number;
    velocity?: number;
  }): void;
  cleanup(): void;
  getUnitNoteOutputMonitor(): UnitNoteOutputMonitorFn | undefined;
  setUnitNoteOutputMonitor(
    monitorFn: UnitNoteOutputMonitorFn | undefined,
  ): void;
};

export function createHostSystem(audioContext: IAudioContext): HostSystem {
  const bus = createHostStateBus(audioContext);
  const connectionManager = createUnitConnectionsManager(bus);
  const unitPersistenceHandlers = createUnitPersistenceHandlers(bus);
  const loadingManager = createUnitsLoadingManager(bus);
  let actionScheduler: WebAudioActionScheduler =
    createWebAudioActionScheduler(audioContext);
  const noteNumberToUnitIdMap = new Map<number, string>();
  let unitNoteOutputMonitorFn: UnitNoteOutputMonitorFn | undefined;

  const internal = {
    addUnitInstancePromise(unitId: string, promise: Promise<HsUnitInstance>) {
      loadingManager.reserveLoadUnit(unitId, promise);
      return () => {
        loadingManager.cancelLoadUnit(promise);
        bus.removeUnit(unitId);
      };
    },
  };

  const unsubscribeInternalEvents = bus.eventPort.subscribe((e) => {
    if (e.type === "beforeRemoveUnit") {
      connectionManager.onUnitRemoving(e.unitInstance.unitId);
    }
  });

  return {
    audioContext,
    get actionScheduler() {
      return actionScheduler;
    },
    setCustomActionScheduler(
      customActionScheduler: WebAudioActionScheduler | "none",
    ) {
      if (customActionScheduler === "none") {
        actionScheduler = createDummyActionScheduler();
      } else {
        actionScheduler = customActionScheduler;
      }
    },
    getAllUnits: bus.getAllUnits,
    eventPort: bus.eventPort,
    registerUnitInstance(unit: HsUnitInstance) {
      const promise = Promise.resolve(unit);
      return internal.addUnitInstancePromise(unit.unitId, promise);
    },
    registerPendingUnitInstancePromise(unitId, unitInstancePromise) {
      return internal.addUnitInstancePromise(unitId, unitInstancePromise);
    },
    reserveConnectionChange(srcUnitId, destSpec) {
      loadingManager.reserveUnitOperation({
        type: "connection",
        op: () =>
          connectionManager.setConnectionChange(srcUnitId, destSpec ?? ""),
      });
    },
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
      for (const unit of bus.getAllUnits()) {
        unit.hostCallbacks?.setMetaAttributes?.(attributes);
      }
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
        const noteOnFn = unit?.inputPorts.noteInput?.noteOn;
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
          const noteOffFn = unit?.inputPorts.noteInput?.noteOff;
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
    getUnitNoteOutputMonitor() {
      return unitNoteOutputMonitorFn;
    },
    setUnitNoteOutputMonitor(monitorFn) {
      unitNoteOutputMonitorFn = monitorFn;
    },
  };
}

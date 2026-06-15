import { MetaAttributes } from "../../unit-types";
import { EventPort } from "../../utils/event-port";
import { createUnitConnectionsManager } from "../linkage/connection-manager";
import {
  DestinationCode,
  HsUnitInstance,
  HsUnitStateData,
} from "../linkage/types";
import { createHostStateBus, HostSystemEvent } from "./host-state-bus";
import { createUnitsLoadingManager } from "./unit-loading-manager";
import { createUnitPersistenceHandlers } from "./unit-persistence";
import {
  createWebAudioActionScheduler,
  WebAudioActionScheduler,
} from "./webaudio-action-scheduler";

export type HostSystem = {
  audioContext: AudioContext;
  actionScheduler: WebAudioActionScheduler;
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
  exportUnitStates(): HsUnitStateData[];
  reserveImportUnitStates(unitStates: HsUnitStateData[]): void;
  emitMetaAttributes(attributes: MetaAttributes): void;
};

export function createHostSystem(audioContext: AudioContext): HostSystem {
  const bus = createHostStateBus(audioContext);
  const connectionManager = createUnitConnectionsManager(bus);
  const unitPersistenceHandlers = createUnitPersistenceHandlers(bus);
  const loadingManager = createUnitsLoadingManager(bus);
  const actionScheduler = createWebAudioActionScheduler(audioContext);

  const internal = {
    addUnitInstancePromise(unitId: string, promise: Promise<HsUnitInstance>) {
      loadingManager.reserveLoadUnit(unitId, promise);
      return () => {
        loadingManager.cancelLoadUnit(promise);
        connectionManager.removeConnectionsForUnit(unitId);
        bus.removeUnit(unitId);
      };
    },
  };

  return {
    audioContext,
    actionScheduler,
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
      const op = () =>
        connectionManager.updateConnection(srcUnitId, destSpec ?? "");
      loadingManager.reserveUnitOperation({ type: "connection", op });
    },
    setMasterGain(gain) {
      bus.masterGainNode.gain.linearRampToValueAtTime(
        gain,
        audioContext.currentTime + 0.01,
      );
    },
    exportUnitStates() {
      return unitPersistenceHandlers.exportUnitStates();
    },
    reserveImportUnitStates(unitStates) {
      const op = () => unitPersistenceHandlers.importUnitStates(unitStates);
      loadingManager.reserveUnitOperation({ type: "state", op });
    },
    emitMetaAttributes(attributes) {
      for (const unit of bus.getAllUnits()) {
        unit.hostCallbacks?.setMetaAttributes?.(attributes);
      }
    },
  };
}

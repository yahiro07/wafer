import { HostSystemCore, UnitLinkageManager } from "../host-system/types";
import {
  createUnitConnectionsManager,
  createUnitConnectionsManagerSingle,
} from "./connection-manager";
import { HsUnitInstance } from "./types";
import { createUnitInterface } from "./unit-interface-impl";

export function createUnitLinkageManager(
  hostSystemCore: HostSystemCore,
): UnitLinkageManager {
  const { bus, loadingManager } = hostSystemCore;
  const connectionManagerSingle = createUnitConnectionsManagerSingle(bus);
  const connectionManager = createUnitConnectionsManager(bus);

  const internal = {
    addUnitInstancePromise(unitId: string, promise: Promise<HsUnitInstance>) {
      loadingManager.reserveLoadUnit(unitId, promise);
      return () => {
        loadingManager.cancelLoadUnit(promise);
        bus.removeUnit(unitId);
      };
    },
  };

  return {
    createUnitInterface(
      unitId: string,
      createdCallback: (unitInstance: HsUnitInstance) => void,
    ) {
      return createUnitInterface(hostSystemCore, unitId, createdCallback);
    },
    //
    registerUnitInstance(unit: HsUnitInstance) {
      const promise = Promise.resolve(unit);
      return internal.addUnitInstancePromise(unit.unitId, promise);
    },
    registerPendingUnitInstancePromise(unitId, unitInstancePromise) {
      return internal.addUnitInstancePromise(unitId, unitInstancePromise);
    },
    reserveConnectionSingle(source, destination) {
      loadingManager.reserveUnitOperation({
        type: "connection",
        op: () =>
          connectionManagerSingle.setConnectionSingle(
            source,
            destination,
            true,
          ),
      });
    },
    removeConnectionSingle(source, destination) {
      connectionManagerSingle.setConnectionSingle(source, destination, false);
    },
    reserveConnectionChange(srcUnitId, destSpec) {
      loadingManager.reserveUnitOperation({
        type: "connection",
        op: () =>
          connectionManager.setConnectionChange(srcUnitId, destSpec ?? ""),
      });
    },
    onUnitRemoving(unitId: string) {
      connectionManagerSingle.onUnitRemoving(unitId);
      connectionManager.onUnitRemoving(unitId);
    },
  };
}

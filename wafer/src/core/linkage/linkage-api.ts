import {
  HostSystemCore,
  NotesDispatcher,
  LinkageApi,
} from "../host-system/types";
import { createUnitInterface } from "./unit-interface-impl";

export function createLinkageApi(
  hostSystemCore: HostSystemCore,
  notesDispatcher: NotesDispatcher,
): LinkageApi {
  let seqLoadingIndex = 0;

  return {
    createUnitInterface(unitId, completeSetupCallback) {
      return createUnitInterface(
        hostSystemCore,
        notesDispatcher,
        unitId,
        completeSetupCallback,
      );
    },
    registerUnitInstance(unit) {
      hostSystemCore.addUnit(unit);
      return () => {
        hostSystemCore.removeUnit(unit.unitId);
      };
    },
    registerPendingUnitInstancePromise(unitId, unitInstancePromise) {
      const unitLoadingId = `${unitId}-${seqLoadingIndex++}`;
      let disposed = false;
      (async () => {
        hostSystemCore.pushUnitLoadingId(unitLoadingId);
        const unit = await unitInstancePromise;
        if (disposed) return;
        hostSystemCore.clearUnitLoadingId(unitLoadingId);
        hostSystemCore.addUnit(unit);
      })();
      return () => {
        disposed = true;
        hostSystemCore.removeUnit(unitId);
        hostSystemCore.clearUnitLoadingId(unitLoadingId);
      };
    },
    reserveConnection(source, destination, enabled) {
      hostSystemCore.addConnectionRule(source, destination, enabled);
    },
    setClockingFrameId(id) {
      notesDispatcher.setClockingFrameId(id);
    },
  };
}

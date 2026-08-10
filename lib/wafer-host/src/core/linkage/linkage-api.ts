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
      type Phase = "loading" | "loaded" | "loadCancelled" | "unloaded";
      let phase: Phase = "loading";
      void (async () => {
        hostSystemCore.pushUnitLoadingId(unitLoadingId);
        const unit = await unitInstancePromise;
        // @ts-expect-error
        if (phase === "loadCancelled") return;
        hostSystemCore.clearUnitLoadingId(unitLoadingId);
        hostSystemCore.addUnit(unit);
        phase = "loaded";
      })();
      return () => {
        if (phase === "loading") {
          hostSystemCore.clearUnitLoadingId(unitLoadingId);
          phase = "loadCancelled";
        } else {
          hostSystemCore.removeUnit(unitId);
          phase = "unloaded";
        }
      };
    },
    reserveConnection(source, destination, enabled) {
      hostSystemCore.pushConnectionRule(source, destination, enabled);
    },
  };
}

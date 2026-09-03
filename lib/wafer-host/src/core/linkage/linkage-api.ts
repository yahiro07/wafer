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
      type Phase =
        | "loading"
        | "loaded"
        | "loadCancelled"
        | "loadFailed"
        | "unloaded";
      let phase: Phase = "loading";
      void (async () => {
        try {
          hostSystemCore.pushUnitLoadingId(unitLoadingId);

          const unit = await unitInstancePromise;
          // @ts-expect-error
          if (phase === "loadCancelled") return;
          hostSystemCore.addUnit(unit);
          phase = "loaded";
        } catch (err) {
          phase = "loadFailed";
          console.warn(err);
          console.warn(`failed to load ${unitId}`);
        } finally {
          hostSystemCore.clearUnitLoadingId(unitLoadingId);
        }
      })();
      return () => {
        if (phase === "loading") {
          hostSystemCore.clearUnitLoadingId(unitLoadingId);
          phase = "loadCancelled";
        } else if (phase === "loaded") {
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

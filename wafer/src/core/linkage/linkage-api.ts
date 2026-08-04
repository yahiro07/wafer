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
  return {
    createUnitInterface(unitId, completeSetupCallback) {
      return createUnitInterface(
        hostSystemCore,
        notesDispatcher,
        unitId,
        completeSetupCallback,
      );
    },
    reserveConnection(source, destination, enabled) {
      hostSystemCore.addConnectionRule(source, destination, enabled);
    },
    setClockingFrameId(id) {
      notesDispatcher.setClockingFrameId(id);
    },
  };
}

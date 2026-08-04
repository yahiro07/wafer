import { HostSystemCore, NotesDispatcher } from "./types";

export function createNotesDispatcher(
  hostSystemCore: HostSystemCore,
): NotesDispatcher {
  return {
    pushNoteDeliveryEvent(noteDeliveryEvent) {},
    setClockingFrameId(id) {},
    setUnitNoteOutputMonitor(monitorFn) {},
  };
}

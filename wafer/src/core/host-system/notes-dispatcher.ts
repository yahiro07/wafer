import { HsNoteInputPort } from "../linkage/types";
import {
  HostSystemCore,
  NoteDeliveryEvent,
  NotesDispatcher,
  UnitNoteOutputMonitorFn,
} from "./types";
import { createWebAudioActionScheduler } from "./webaudio-action-scheduler";

function getNoteDestinationPortKeys(
  hostSystemCore: HostSystemCore,
  sourcePortKey: string,
): string[] {
  return hostSystemCore.bus
    .getConnectionRules()
    .filter((it) => it.srcPortKey === sourcePortKey)
    .map((it) => it.destPortKey);
}

function mapPortKeysToPorts(
  hostSystemCore: HostSystemCore,
  portKeys: string[],
): HsNoteInputPort[] {
  return portKeys
    .map((portKey) => {
      const [unitId] = portKey.split(".");
      const unit = hostSystemCore.bus.getUnit(unitId);
      return unit?.primaryInputPorts.noteInput;
    })
    .filter(Boolean) as HsNoteInputPort[];
}

export function createNotesDispatcher(
  hostSystemCore: HostSystemCore,
): NotesDispatcher {
  const actionScheduler = createWebAudioActionScheduler(
    hostSystemCore.bus.audioContext,
  );
  const hopIds: string[] = [];
  let unitNoteOutputMonitorFn: UnitNoteOutputMonitorFn | undefined;

  const internal = {
    pushNoteDeliveryEventImpl(noteDeliveryEvent: NoteDeliveryEvent) {
      const { time, sourcePortKey, destPortKey, noteNumber, velocity, isOn } =
        noteDeliveryEvent;
      let destPortKeys: string[] | undefined;
      if (!sourcePortKey && destPortKey) {
        destPortKeys = [destPortKey];
      } else if (sourcePortKey) {
        destPortKeys = getNoteDestinationPortKeys(
          hostSystemCore,
          sourcePortKey,
        );
      }
      if (destPortKeys) {
        const sourceUnitId = sourcePortKey?.split(".")[0];
        const destPorts = mapPortKeysToPorts(hostSystemCore, destPortKeys);
        actionScheduler.pushAction(() => {
          if (sourceUnitId) {
            unitNoteOutputMonitorFn?.({
              sourceUnitId,
              noteNumber,
              isOn,
              time,
              velocity,
            });
          }
          if (1) {
            console.log(
              `deliverNote ${sourcePortKey}-->${destPortKeys.join(", ")} ${noteNumber} ${isOn ? "on" : "off"} ${time}`,
            );
          }
          for (const port of destPorts) {
            if (isOn) {
              port.noteOn(noteNumber, time, velocity);
            } else {
              port.noteOff(noteNumber, time);
            }
          }
        }, time);
      }
    },
  };
  return {
    pushNoteDeliveryEvent(noteDeliveryEvent) {
      const { sourcePortKey } = noteDeliveryEvent;
      if (sourcePortKey) {
        if (hopIds.includes(sourcePortKey)) {
          console.warn(
            `recursive note delivery loop detected`,
            hopIds.join(" > "),
          );
          return;
        }
        // console.log(`hopIds: ${hopIds.join(" > ")}`);
        try {
          hopIds.push(sourcePortKey);
          internal.pushNoteDeliveryEventImpl(noteDeliveryEvent);
        } finally {
          hopIds.pop();
        }
      } else {
        internal.pushNoteDeliveryEventImpl(noteDeliveryEvent);
      }
    },
    // setClockingFrameId(id) {
    //   console.log(`clocking frame id: ${id}`);
    // },
    setUnitNoteOutputMonitor(monitorFn) {
      unitNoteOutputMonitorFn = monitorFn;
    },
  };
}

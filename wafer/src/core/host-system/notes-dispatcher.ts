import { HsNoteInputPort } from "../linkage/types";
import { HostSystemCore, NotesDispatcher } from "./types";
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
  return {
    pushNoteDeliveryEvent(noteDeliveryEvent) {
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
        for (const destPortKey of destPortKeys) {
          console.log(
            `deliverNote ${sourcePortKey}-->${destPortKey} ${noteNumber} ${isOn ? "on" : "off"}`,
          );
        }
        const destPorts = mapPortKeysToPorts(hostSystemCore, destPortKeys);
        actionScheduler.pushAction(() => {
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
    // setClockingFrameId(id) {
    //   console.log(`clocking frame id: ${id}`);
    // },
    // setUnitNoteOutputMonitor(monitorFn) {},
  };
}

import { HsNoteInputPort } from "../linkage/types";
import { createDelayedEventScheduler } from "./delayed-event-scheduler";
import {
  HostSystemCore,
  NoteDeliveryEvent,
  NotesDispatcher,
  UnitNoteOutputMonitorFn,
} from "./types";
import { createWebAudioActionScheduler } from "./webaudio-action-scheduler";
import { safeInvoke } from "./wrap-unit-call";

function getNoteDestinationPortKeys(
  hostSystemCore: HostSystemCore,
  sourcePortKey: string,
): string[] {
  const sourceUnitId = sourcePortKey.split(".")[0];
  const sourcePrimaryOutputPortKey = `${sourceUnitId}.primaryOutput`;
  return hostSystemCore.bus
    .getConnectionRules()
    .filter(
      (it) =>
        it.srcPortKey === sourcePortKey ||
        it.srcPortKey === sourcePrimaryOutputPortKey,
    )
    .map((it) => it.destPortKey);
}

function getAutomationDestinationPortKeyAndParameterIds(
  hostSystemCore: HostSystemCore,
  sourcePortKey: string,
): { portKey: string; parameterId?: string }[] {
  return hostSystemCore.bus
    .getConnectionRules()
    .filter((it) => it.srcPortKey === sourcePortKey)
    .map((it) => ({
      portKey: it.destPortKey,
      parameterId: it.destParameterId,
    }));
}

function mapPortKeysToPorts(
  hostSystemCore: HostSystemCore,
  portKeys: string[],
): { unitId: string; port: HsNoteInputPort }[] {
  return portKeys
    .map((portKey) => {
      const [unitId, portId] = portKey.split(".");
      if (portId === "primaryInput" || portId === "noteInput") {
        const unit = hostSystemCore.bus.getUnit(unitId);
        // return unit?.primaryInputPorts.noteInput;
        if (unit) {
          return { unitId, port: unit.primaryInputPorts.noteInput };
        }
      }
    })
    .filter(Boolean) as { unitId: string; port: HsNoteInputPort }[];
}

export function createNotesDispatcher(
  hostSystemCore: HostSystemCore,
): NotesDispatcher {
  const delayedEventScheduler = createDelayedEventScheduler(
    hostSystemCore.bus.audioContext,
  );
  const actionScheduler = createWebAudioActionScheduler(
    hostSystemCore.bus.audioContext,
  );
  const hopIds: string[] = [];
  let unitNoteOutputMonitorFn: UnitNoteOutputMonitorFn | undefined;

  const internal = {
    pushNoteDeliveryEventImpl(noteDeliveryEvent: NoteDeliveryEvent) {
      const {
        time: inputTime,
        sourcePortKey,
        destPortKey,
        noteNumber,
        attrs,
        isOn,
      } = noteDeliveryEvent;

      const time = Math.max(
        inputTime ?? 0,
        hostSystemCore.bus.audioContext.currentTime,
      );
      if (isOn) {
        //flush reserved note off events before note on
        delayedEventScheduler.forceFlushEventsTillTime(time + 0.005);
      }

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
        const destPortItems = mapPortKeysToPorts(hostSystemCore, destPortKeys);
        if (destPortItems.length > 0) {
          const sideEffects = () => {
            if (sourceUnitId) {
              unitNoteOutputMonitorFn?.({
                sourceUnitId,
                noteNumber,
                isOn,
                time: inputTime,
                attrs,
              });
            }
            if (0) {
              console.log(
                `deliverNote ${sourcePortKey}-->${destPortKeys.join(", ")} ${noteNumber} ${isOn ? "on" : "off"} ${time}`,
              );
            }
          };
          for (const portItem of destPortItems) {
            const { unitId: destUnitId, port } = portItem;
            if (isOn) {
              sideEffects();
              safeInvoke(port.noteOn)?.(noteNumber, time, attrs);
            } else {
              // safeInvoke(port.noteOff)?.(noteNumber, time);
              delayedEventScheduler.pushNoteOffInvocationItem({
                notePort: port,
                noteSourceUnitId: sourceUnitId ?? "",
                noteDestinationUnitId: destUnitId ?? "",
                noteNumber,
                time,
                sideEffects,
              });
            }
          }
        }
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
    pushAutomationDeliveryEvent(automationDeliveryEvent) {
      const { sourcePortKey, value, options } = automationDeliveryEvent;
      const destItems = getAutomationDestinationPortKeyAndParameterIds(
        hostSystemCore,
        sourcePortKey,
      );
      for (const destItem of destItems) {
        const destUnitId = destItem.portKey.split(".")[0];
        const unit = hostSystemCore.bus.getUnit(destUnitId);
        const port = unit?.automationInput;
        const parameterId = destItem.parameterId;
        if (port && parameterId) {
          actionScheduler.pushAction(() => {
            safeInvoke(port.setParameter)?.(parameterId, value, options);
          }, options?.time);
        }
      }
    },
    setUnitNoteOutputMonitor(monitorFn) {
      unitNoteOutputMonitorFn = monitorFn;
    },
    flushPendingNotesOff(options) {
      delayedEventScheduler.flushPendingNotesOff(options);
    },
  };
}

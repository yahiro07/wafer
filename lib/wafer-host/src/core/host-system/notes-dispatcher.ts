import { removeArrayItem } from "../../utils/array-utils";
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

const helpers = {
  getNoteDestinationPortKeys(
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
  },
  getAutomationDestinationPortKeyAndParameterIds(
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
  },
  mapPortKeyToPortItem(
    hostSystemCore: HostSystemCore,
    portKey: string,
  ): { unitId: string; port: HsNoteInputPort } | undefined {
    const [unitId, portId] = portKey.split(".");
    if (portId === "primaryInput" || portId === "noteInput") {
      const unit = hostSystemCore.bus.getUnit(unitId);
      const port = unit?.primaryInputPorts.noteInput;
      if (port) {
        return { unitId, port };
      }
    }
  },
  mapPortKeysToPortItems(hostSystemCore: HostSystemCore, portKeys: string[]) {
    return portKeys
      .map((portKey) => helpers.mapPortKeyToPortItem(hostSystemCore, portKey))
      .filter(Boolean) as { unitId: string; port: HsNoteInputPort }[];
  },
};

export function createNotesDispatcher(
  hostSystemCore: HostSystemCore,
): NotesDispatcher {
  const audioContext = hostSystemCore.bus.audioContext;
  const delayedEventScheduler = createDelayedEventScheduler(
    hostSystemCore.bus.audioContext,
  );
  const actionScheduler = createWebAudioActionScheduler(
    hostSystemCore.bus.audioContext,
  );
  const hopIds: string[] = [];
  let unitNoteOutputMonitorFn: UnitNoteOutputMonitorFn | undefined;

  const noteToDestPortKeysMap = new Map<string, string[]>();

  const internal = {
    pushNoteDeliveryEventImplInner(
      noteDeliveryEvent: NoteDeliveryEvent,
      destPortKeys: string[],
      sourceUnitId: string | undefined,
      destPortItems: { unitId: string; port: HsNoteInputPort }[],
      inputTime: number | undefined,
      time: number,
    ) {
      const { sourcePortKey, noteNumber, isOn, attrs } = noteDeliveryEvent;
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
    },
    getDestPortKeysForNoteOn(
      sourcePortKey: string | undefined,
      destPortKey: string | undefined,
    ) {
      if (!sourcePortKey && destPortKey) {
        return [destPortKey];
      } else if (sourcePortKey) {
        return helpers.getNoteDestinationPortKeys(
          hostSystemCore,
          sourcePortKey,
        );
      }
    },
    pushNoteDeliveryEventImpl(noteDeliveryEvent: NoteDeliveryEvent) {
      const {
        noteNumber,
        time: inputTime,
        sourcePortKey,
        destPortKey,
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
      const sourceUnitId = sourcePortKey?.split(".")[0];

      const deliveryKey = `${sourcePortKey}!${destPortKey}!${noteNumber}`;
      let destPortKeys: string[] | undefined;
      if (isOn) {
        if (noteToDestPortKeysMap.has(deliveryKey)) return;
        destPortKeys = internal.getDestPortKeysForNoteOn(
          sourcePortKey,
          destPortKey,
        );
        if (destPortKeys) {
          noteToDestPortKeysMap.set(deliveryKey, destPortKeys);
        }
      } else {
        destPortKeys = noteToDestPortKeysMap.get(deliveryKey);
        noteToDestPortKeysMap.delete(deliveryKey);
      }
      if (destPortKeys) {
        const destPortItems = helpers.mapPortKeysToPortItems(
          hostSystemCore,
          destPortKeys,
        );
        if (destPortItems.length > 0) {
          internal.pushNoteDeliveryEventImplInner(
            noteDeliveryEvent,
            destPortKeys,
            sourceUnitId,
            destPortItems,
            inputTime,
            time,
          );
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
      const destItems = helpers.getAutomationDestinationPortKeyAndParameterIds(
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
    forceStopActiveNotes(options) {
      if (options?.noteDestinationUnitId) {
        const targetPortKeys = [
          `${options.noteDestinationUnitId}.primaryInput`,
          `${options.noteDestinationUnitId}.noteInput`,
        ];
        for (const [
          deliveryKey,
          destPortKeys,
        ] of noteToDestPortKeysMap.entries()) {
          for (const destPortKey of destPortKeys) {
            if (targetPortKeys.includes(destPortKey)) {
              const portItem = helpers.mapPortKeyToPortItem(
                hostSystemCore,
                destPortKey,
              );
              if (portItem) {
                const [_sourcePortKey, _destPortKey, noteNumberText] =
                  deliveryKey.split("!");
                const noteNumber = parseInt(noteNumberText);
                safeInvoke(portItem.port.noteOff)?.(
                  noteNumber,
                  audioContext.currentTime,
                );
              }
              removeArrayItem(destPortKeys, destPortKey);
              if (destPortKeys.length === 0) {
                noteToDestPortKeysMap.delete(deliveryKey);
              }
            }
          }
        }
      } else {
        for (const [
          deliveryKey,
          destPortKeys,
        ] of noteToDestPortKeysMap.entries()) {
          const portItems = helpers.mapPortKeysToPortItems(
            hostSystemCore,
            destPortKeys,
          );
          if (portItems.length > 0) {
            const noteNumber = parseInt(deliveryKey.split("!")[2]);
            for (const portItem of portItems) {
              safeInvoke(portItem.port.noteOff)?.(
                noteNumber,
                audioContext.currentTime,
              );
            }
          }
        }
        noteToDestPortKeysMap.clear();
        delayedEventScheduler.flushPendingNotesOff();
      }
    },
  };
}

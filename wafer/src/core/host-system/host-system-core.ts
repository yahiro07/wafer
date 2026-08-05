import { removeArrayItems } from "../../utils/array-utils";
import { createHostStateBus } from "./host-state-bus";
import { HostSystemCore, IAudioContext } from "./types";

export function createHostSystemCore(
  audioContext: IAudioContext,
): HostSystemCore {
  const bus = createHostStateBus(audioContext);
  const internal = {
    cleanupDesiredConnectionsBeforeRemovingUnit(unitId: string) {
      removeArrayItems(
        bus.connectionRules,
        (it) => it.srcUnitId === unitId || it.destUnitId === unitId,
      );
      bus.internalEventPort.emit({ type: "connectionRulesChanged" });
    },
  };
  return {
    bus,
    pushUnitLoadingId(id) {
      bus.unitLoadingIds.add(id);
    },
    clearUnitLoadingId(id) {
      const prevCount = bus.unitLoadingIds.size;
      bus.unitLoadingIds.delete(id);
      const count = bus.unitLoadingIds.size;
      if (prevCount === 1 && count === 0) {
        bus.internalEventPort.emit({ type: "pendingUnitsLoaded" });
      }
    },
    addUnit(unit) {
      bus.units.set(unit.unitId, unit);
      bus.internalEventPort.emit({ type: "unitAdded", unitId: unit.unitId });
      bus.eventPort.emit({ type: "unitAdded", unitInstance: unit });
    },
    removeUnit(unitId) {
      const unit = bus.units.get(unitId);
      if (unit) {
        internal.cleanupDesiredConnectionsBeforeRemovingUnit(unitId);
        // bus.internalEventPort.emit({ type: "beforeRemoveUnit", unitId });
        bus.eventPort.emit({ type: "beforeRemoveUnit", unitInstance: unit });
        unit.cleanup?.();
        bus.eventPort.emit({ type: "unitRemoved", unitId });
        bus.units.delete(unitId);
      }
    },
    pushConnectionRule(source, destination, next) {
      const connectionKey = `${source}>${destination}`;
      const curr = bus.connectionRules.find(
        (rule) => rule.connectionKey === connectionKey,
      );
      if (!curr && next) {
        const srcUnitId = source.split(".")[0];
        const destUnitId = destination.split(".")[0];
        bus.connectionRules.push({
          connectionKey,
          srcPortKey: source,
          destPortKey: destination,
          srcUnitId,
          destUnitId,
        });
        bus.internalEventPort.emit({ type: "connectionRulesChanged" });
      } else if (curr && !next) {
        removeArrayItems(
          bus.connectionRules,
          (it) => it.connectionKey === connectionKey,
        );
        bus.internalEventPort.emit({ type: "connectionRulesChanged" });
      }
    },
    emitMetaAttributes(attributes) {
      for (const unit of bus.getAllUnits()) {
        unit.hostCallbacks?.setMetaAttributes?.(attributes);
      }
    },
  };
}

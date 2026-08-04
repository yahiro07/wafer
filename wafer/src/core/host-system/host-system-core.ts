import { createHostStateBus } from "./host-state-bus";
import { HostSystemCore, IAudioContext } from "./types";

export function createHostSystemCore(
  audioContext: IAudioContext,
  // actionScheduler: WebAudioActionScheduler,
): HostSystemCore {
  const bus = createHostStateBus(audioContext);
  // const loadingManager = createUnitLoadingManager(bus);
  // let unitNoteOutputMonitorFn: UnitNoteOutputMonitorFn | undefined;
  return {
    bus,
    pushUnitLoadingId(id) {
      bus.unitLoadingIds.add(id);
    },
    clearUnitLoadingId(id) {
      bus.unitLoadingIds.delete(id);
      if (bus.unitLoadingIds.size === 0) {
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
        bus.eventPort.emit({ type: "beforeRemoveUnit", unitInstance: unit });
        unit.cleanup?.();
        bus.eventPort.emit({ type: "unitRemoved", unitId });
        bus.internalEventPort.emit({ type: "unitRemoved", unitId });
        bus.units.delete(unitId);
      }
    },
    addConnectionRule(source, destination, enabled) {
      bus.connectionRules.push({ source, destination, enabled });
      bus.internalEventPort.emit({ type: "connectionRulesChanged" });
    },
    emitMetaAttributes(attributes) {
      for (const unit of bus.getAllUnits()) {
        unit.hostCallbacks?.setMetaAttributes?.(attributes);
      }
    },
    // getUnitNoteOutputMonitor() {
    //   return unitNoteOutputMonitorFn;
    // },
    // setUnitNoteOutputMonitor(monitorFn) {
    //   unitNoteOutputMonitorFn = monitorFn;
    // },
  };
}

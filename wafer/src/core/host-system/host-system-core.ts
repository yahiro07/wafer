import { createHostStateBus } from "./host-state-bus";
import {
  HostSystemCore,
  IAudioContext,
  UnitNoteOutputMonitorFn,
} from "./types";
import { createUnitLoadingManager } from "./unit-loading-manager";
import { WebAudioActionScheduler } from "./webaudio-action-scheduler";

export function createHostSystemCore(
  audioContext: IAudioContext,
  actionScheduler: WebAudioActionScheduler,
): HostSystemCore {
  const bus = createHostStateBus(audioContext);
  const loadingManager = createUnitLoadingManager(bus);
  let unitNoteOutputMonitorFn: UnitNoteOutputMonitorFn | undefined;
  return {
    bus,
    loadingManager,
    audioContext,
    get actionScheduler() {
      return actionScheduler;
    },
    emitMetaAttributes(attributes) {
      for (const unit of bus.getAllUnits()) {
        unit.hostCallbacks?.setMetaAttributes?.(attributes);
      }
    },
    getUnitNoteOutputMonitor() {
      return unitNoteOutputMonitorFn;
    },
    setUnitNoteOutputMonitor(monitorFn) {
      unitNoteOutputMonitorFn = monitorFn;
    },
  };
}

import { HostSystemCore, UnitLinkageManager } from "../host-system/types";

export function createUnitLinkageManager(
  hostSystemCore: HostSystemCore,
): UnitLinkageManager {
  const unsubscribeInternalEvents =
    hostSystemCore.bus.internalEventPort.subscribe((event) => {
      if (event.type === "unitAdded") {
      } else if (event.type === "connectionRulesChanged") {
      }
    });
  return {
    cleanup() {
      unsubscribeInternalEvents();
    },
  };
}

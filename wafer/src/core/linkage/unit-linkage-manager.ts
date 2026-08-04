import { HostSystemCore, UnitLinkageManager } from "../host-system/types";

export function createUnitLinkageManager(
  hostSystemCore: HostSystemCore,
): UnitLinkageManager {
  const unsubscribeInternalEvents =
    hostSystemCore.bus.internalEventPort.subscribe((event) => {
      console.log(event);
      if (event.type === "unitAdded") {
      } else if (event.type === "connectionRulesChanged") {
        const conns = hostSystemCore.bus.getConnectionRules();
        console.log(conns);
      }
    });
  return {
    cleanup() {
      unsubscribeInternalEvents();
    },
  };
}

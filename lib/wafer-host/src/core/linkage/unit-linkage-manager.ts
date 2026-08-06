import { HostSystemCore, UnitLinkageManager } from "../host-system/types";
import {
  ConnectionManagerSingle,
  createUnitConnectionsManagerSingle,
} from "./connection-manager";

function decodeConnectionKey(key: string): {
  srcUnitId: string;
  destUnitId: string;
  srcPortKey: string;
  destPortKey: string;
} {
  const [srcPortKey, destPortKey] = key.split(">");
  const srcUnitId = srcPortKey.split(".")[0];
  const destUnitId = destPortKey.split(".")[0];
  return {
    srcUnitId,
    srcPortKey,
    destUnitId,
    destPortKey,
  };
}

function updateConnections(
  connectionManager: ConnectionManagerSingle,
  activeUnitIds: Set<string>,
  actualConnectionKeys: Set<string>,
  desiredConnectionKeys: Set<string>,
) {
  let numAdded = 0;
  let numRemoved = 0;
  const connectionsToRemove = Array.from(actualConnectionKeys).filter(
    (key) => !desiredConnectionKeys.has(key),
  );
  for (const conn of connectionsToRemove) {
    const { srcUnitId, srcPortKey, destUnitId, destPortKey } =
      decodeConnectionKey(conn);
    const hasSrcUnit = activeUnitIds.has(srcUnitId);
    const hasDestUnit =
      activeUnitIds.has(destUnitId) || destUnitId === "$output";

    if (!(hasSrcUnit && hasDestUnit)) {
      console.warn(
        "unit has already been removed when cleaning up the connection",
        !hasSrcUnit ? `srcUnitId: ${srcUnitId}` : "",
        !hasDestUnit ? `destUnitId: ${destUnitId}` : "",
      );
    }
    connectionManager.setConnectionSingle(srcPortKey, destPortKey, false);
    actualConnectionKeys.delete(conn);
    numRemoved++;
  }

  const connectionsToAdd = Array.from(desiredConnectionKeys).filter(
    (key) => !actualConnectionKeys.has(key),
  );
  for (const conn of connectionsToAdd) {
    const { srcUnitId, srcPortKey, destUnitId, destPortKey } =
      decodeConnectionKey(conn);
    const hasSrcUnit = activeUnitIds.has(srcUnitId);
    const hasDestUnit =
      activeUnitIds.has(destUnitId) || destUnitId === "$output";
    if (hasSrcUnit && hasDestUnit) {
      connectionManager.setConnectionSingle(srcPortKey, destPortKey, true);
      actualConnectionKeys.add(conn);
      numAdded++;
    }
  }
  // console.log(`updated connections: ${numAdded} added, ${numRemoved} removed`);
}

export function createUnitLinkageManager(
  hostSystemCore: HostSystemCore,
): UnitLinkageManager {
  const connectionManager = createUnitConnectionsManagerSingle(
    hostSystemCore.bus,
  );
  const actualConnectionKeys = new Set<string>();

  const internal = {
    wrapUpdateConnection() {
      const activeUnitIds = new Set(
        hostSystemCore.bus.getAllUnits().map((unit) => unit.unitId),
      );
      const connectionRules = hostSystemCore.bus.getConnectionRules();
      const desiredConnectionKeys = new Set(
        connectionRules.map((rule) => rule.connectionKey),
      );
      updateConnections(
        connectionManager,
        activeUnitIds,
        actualConnectionKeys,
        desiredConnectionKeys,
      );
    },
  };

  const unsubscribeInternalEvents =
    hostSystemCore.bus.internalEventPort.subscribe((event) => {
      if (event.type === "unitAdded") {
        internal.wrapUpdateConnection();
      } else if (event.type === "connectionRulesChanged") {
        internal.wrapUpdateConnection();
      }
    });
  return {
    cleanup() {
      unsubscribeInternalEvents();
    },
  };
}

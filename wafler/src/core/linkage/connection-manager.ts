import { HostStateBus } from "../host-system/host-state-bus";
import { DestinationCode, HsUnitInstance } from "./types";

export type ConnectionManager = {
  updateConnections(newConnectionCodeMap: Map<string, DestinationCode>): void;
  removeConnectionsForUnit(unitId: string): void;
};

type ConnectingOperation = "connect" | "disconnect";

function updateConnectionToUnit(
  srcUnit: HsUnitInstance,
  destUnit: HsUnitInstance,
  operation: "connectTo" | "disconnectTo",
) {
  const srcOuts = srcUnit.outputPorts;
  const destIns = destUnit.inputPorts;
  if (srcOuts.audioOutput && destIns.audioInput) {
    srcOuts.audioOutput[operation](destIns.audioInput);
  }
  if (srcOuts.noteOutput && destIns.noteInput) {
    srcOuts.noteOutput[operation](destIns.noteInput);
  }
}

function updateUnitConnectionToPort(
  bus: HostStateBus,
  srcUnit: HsUnitInstance,
  destSpec: string,
  operation: ConnectingOperation,
) {
  const srcSpec = srcUnit.unitId;
  if (destSpec === "$output") {
    if (srcUnit.outputPorts.audioOutput) {
      const destPort = bus.audioDestinationVirtualInputPort;
      if (operation === "connect") {
        console.log(`connecting ${srcSpec} --> ${destSpec}`);
        srcUnit.outputPorts.audioOutput.connectTo(destPort);
      } else if (operation === "disconnect") {
        console.log(`disconnecting ${srcSpec} --> ${destSpec}`);
        srcUnit.outputPorts.audioOutput.disconnectTo(destPort);
      }
    }
  } else {
    const destUnit = bus.getUnit(destSpec);
    if (srcUnit && destUnit) {
      if (operation === "connect") {
        console.log(`connecting ${srcSpec} --> ${destSpec}`);
        updateConnectionToUnit(srcUnit, destUnit, "connectTo");
      } else if (operation === "disconnect") {
        console.log(`disconnecting ${srcSpec} --> ${destSpec}`);
        updateConnectionToUnit(srcUnit, destUnit, "disconnectTo");
      }
    }
  }
}

function updateUnitConnectionForSingleOutputPortWithFanOut(
  bus: HostStateBus,
  unit: HsUnitInstance,
  curr: DestinationCode,
  next: DestinationCode,
) {
  const currs = curr?.split("&").filter(Boolean) ?? [];
  const nexts = next?.split("&").filter(Boolean) ?? [];
  const toConnect = nexts.filter((dest) => !currs.includes(dest));
  const toDisconnect = currs.filter((dest) => !nexts.includes(dest));
  for (const destSpec of toDisconnect) {
    updateUnitConnectionToPort(bus, unit, destSpec, "disconnect");
  }
  for (const destSpec of toConnect) {
    updateUnitConnectionToPort(bus, unit, destSpec, "connect");
  }
}

export function createUnitConnectionsManager(bus: HostStateBus) {
  const connectionCodeMap: Map<string, DestinationCode> = new Map();
  return {
    updateConnection(unitId: string, newConnectionCode: DestinationCode) {
      const unit = bus.getUnit(unitId);
      if (unit) {
        const curr = connectionCodeMap.get(unit.unitId);
        const next = newConnectionCode;
        if (next !== undefined && next !== curr) {
          updateUnitConnectionForSingleOutputPortWithFanOut(
            bus,
            unit,
            curr ?? "",
            next,
          );
          connectionCodeMap.set(unit.unitId, next);
        }
      }
    },
    removeConnectionsForUnit(unitId: string) {
      const unit = bus.getUnit(unitId);
      const curr = connectionCodeMap.get(unitId);
      if (unit && curr) {
        updateUnitConnectionForSingleOutputPortWithFanOut(bus, unit, curr, "");
        connectionCodeMap.delete(unitId);
      }
    },
  };
}

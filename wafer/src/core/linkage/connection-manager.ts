import { HostStateBus } from "../host-system/host-state-bus";
import { DestinationCode, HsUnitInstance } from "./types";

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

let numConnections = 0;

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
        numConnections++;
      } else if (operation === "disconnect") {
        console.log(`disconnecting ${srcSpec} --> ${destSpec}`);
        srcUnit.outputPorts.audioOutput.disconnectTo(destPort);
        numConnections--;
      }
    }
  } else {
    const destUnit = bus.getUnit(destSpec);
    if (srcUnit && destUnit) {
      if (operation === "connect") {
        console.log(`connecting ${srcSpec} --> ${destSpec}`);
        updateConnectionToUnit(srcUnit, destUnit, "connectTo");
        numConnections++;
      } else if (operation === "disconnect") {
        console.log(`disconnecting ${srcSpec} --> ${destSpec}`);
        updateConnectionToUnit(srcUnit, destUnit, "disconnectTo");
        numConnections--;
      }
    }
  }
}

export type ConnectionManager = {
  setConnectionChange(srcUnitId: string, destSpec: DestinationCode): void;
  onUnitRemoving(unitId: string): void;
};

export function createUnitConnectionsManager(
  bus: HostStateBus,
): ConnectionManager {
  let activeConnectionKeys: string[] = [];

  return {
    setConnectionChange(srcUnitId: string, destSpec: DestinationCode) {
      const unit = bus.getUnit(srcUnitId);
      if (!unit) return;

      let connectionsToAdd: string[] = [];
      let connectionsToRemove: string[] = [];

      if (destSpec) {
        const existingKeys = activeConnectionKeys.filter(
          (key) => key.split(">")[0] === srcUnitId,
        );
        const codes = [...new Set(destSpec.split("&").filter(Boolean))];
        const nextKeys = codes.map((code) => `${srcUnitId}>${code}`);

        connectionsToAdd = nextKeys.filter(
          (key) => !existingKeys.includes(key),
        );
        connectionsToRemove = existingKeys.filter(
          (key) => !nextKeys.includes(key),
        );
      } else {
        connectionsToRemove = activeConnectionKeys.filter(
          (key) => key.split(">")[0] === srcUnitId,
        );
      }
      for (const key of connectionsToAdd) {
        updateUnitConnectionToPort(bus, unit, key.split(">")[1], "connect");
      }
      for (const key of connectionsToRemove) {
        updateUnitConnectionToPort(bus, unit, key.split(">")[1], "disconnect");
      }
      activeConnectionKeys = [
        ...activeConnectionKeys,
        ...connectionsToAdd,
      ].filter((key) => !connectionsToRemove.includes(key));
      console.log(`numConnections: ${numConnections}`);
    },
    onUnitRemoving(unitId: string) {
      const unit = bus.getUnit(unitId);
      if (!unit) return;
      const connectionsToRemove = activeConnectionKeys.filter((key) => {
        const [first, second] = key.split(">");
        return first === unitId || second === unitId;
      });
      for (const key of connectionsToRemove) {
        const [first, second] = key.split(">");
        const srcUnit = bus.getUnit(first);
        if (srcUnit) {
          updateUnitConnectionToPort(bus, srcUnit, second, "disconnect");
        }
      }
      activeConnectionKeys = activeConnectionKeys.filter(
        (key) => !connectionsToRemove.includes(key),
      );
      console.log(`numConnections: ${numConnections}`);
    },
  };
}

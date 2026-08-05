import { PortSubtype } from "../../unit-types";
import { HostStateBus } from "../host-system/types";
import {
  DestinationCode,
  HsAudioInputPort,
  HsAudioOutputPort,
  HsAutomationInputPort,
  HsAutomationOutputPort,
  HsNoteInputPort,
  HsNoteOutputPort,
  HsUnitInstance,
} from "./types";

export type ConnectionManagerSingle = {
  setConnectionSingle(
    source: string,
    destination: string,
    active: boolean,
  ): void;
  onUnitRemoving(unitId: string): void;
};

export type ConnectionManager = {
  setConnectionChange(srcUnitId: string, destSpec: DestinationCode): void;
  onUnitRemoving(unitId: string): void;
};

type ConnectingOperation = "connectTo" | "disconnectTo";

type UnitPortSpec = {
  // oxlint-disable-next-line no-redundant-type-constituents
  unitId: string | "$output";
  // oxlint-disable-next-line no-redundant-type-constituents
  portId: string | "primaryOutput" | "primaryInput";
};

type UnitPortConnectionEntry = {
  key: string;
  from: UnitPortSpec;
  to: UnitPortSpec;
};

function createUnitPortConnectionEntry(
  from: UnitPortSpec,
  to: UnitPortSpec,
): UnitPortConnectionEntry {
  const key = `${from.unitId}.${from.portId}>${to.unitId}.${to.portId}`;
  return { key, from, to };
}

type CompositePort = {
  audioOutput?: HsAudioOutputPort;
  noteOutput?: HsNoteOutputPort;
  automationOutput?: HsAutomationOutputPort;
  audioInput?: HsAudioInputPort;
  noteInput?: HsNoteInputPort;
  automationInput?: HsAutomationInputPort;
};

function updateConnectionCompositePortToOutput(
  bus: HostStateBus,
  srcOuts: CompositePort,
  operation: ConnectingOperation,
): PortSubtype[] | undefined {
  const destPort = bus.audioDestinationVirtualInputPort;
  if (srcOuts.audioOutput) {
    srcOuts.audioOutput[operation](destPort);
    return ["audio"];
  }
  return undefined;
}

function updateConnectionBetweenCompositePort(
  srcOuts: CompositePort,
  destIns: CompositePort,
  operation: "connectTo" | "disconnectTo",
): PortSubtype[] | undefined {
  const portSubtypes: PortSubtype[] = [];
  if (srcOuts.audioOutput && destIns.audioInput) {
    srcOuts.audioOutput[operation](destIns.audioInput);
    portSubtypes.push("audio");
  }
  if (srcOuts.noteOutput && destIns.noteInput) {
    srcOuts.noteOutput[operation](destIns.noteInput);
    portSubtypes.push("note");
  }
  if (srcOuts.automationOutput && destIns.automationInput) {
    srcOuts.automationOutput[operation](destIns.automationInput);
    portSubtypes.push("automation");
  }
  return portSubtypes.length > 0 ? portSubtypes : undefined;
}

function getUnitOutputCompositePort(
  unit: HsUnitInstance,
  portId: string,
): CompositePort | undefined {
  if (portId === "primaryOutput") {
    return unit.primaryOutputPorts;
  } else if (portId === "audioOutput") {
    return { audioOutput: unit.primaryOutputPorts.audioOutput };
  } else if (portId === "noteOutput") {
    return { noteOutput: unit.primaryOutputPorts.noteOutput };
  } else if (portId === "automationOutput") {
    return { automationOutput: unit.primaryOutputPorts.automationOutput };
  }
  const port = unit.additionalAudioOutputs?.[portId];
  return port ? { audioOutput: port } : undefined;
}

function getUnitInputCompositePort(
  unit: HsUnitInstance,
  portId: string,
): CompositePort | undefined {
  if (portId === "primaryInput") {
    return unit.primaryInputPorts;
  } else if (portId === "audioInput") {
    return { audioInput: unit.primaryInputPorts.audioInput };
  } else if (portId === "noteInput") {
    return { noteInput: unit.primaryInputPorts.noteInput };
  } else if (portId === "automationInput") {
    return { automationInput: unit.primaryInputPorts.automationInput };
  }
  const port = unit.additionalAudioInputs?.[portId];
  return port ? { audioInput: port } : undefined;
}

function callUnitConnectionCallback(
  srcUnit: HsUnitInstance,
  portId: string,
  operation: ConnectingOperation,
  portSubtypes: PortSubtype[],
) {
  if (operation === "connectTo") {
    srcUnit.unitCallbacks?.onConnectedTo?.(portId, portSubtypes);
  } else {
    srcUnit.unitCallbacks?.onDisconnectedTo?.(portId);
  }
}

let numConnections = 0;
let reportingReserved = false;

function reportNumConnections() {
  if (!reportingReserved) {
    reportingReserved = true;
    setTimeout(() => {
      console.log(`numConnections: ${numConnections}`);
      reportingReserved = false;
    }, 1);
  }
}

function logConnectionChange(
  from: UnitPortSpec,
  to: UnitPortSpec,
  operation: ConnectingOperation,
) {
  if (operation === "connectTo") {
    console.log(
      `connected ${from.unitId}.${from.portId} --> ${to.unitId}.${to.portId}`
        .replace(".primaryOutput", "")
        .replace(".primaryInput", ""),
    );
    numConnections++;
  } else {
    console.log(
      `disconnected ${from.unitId}.${from.portId} --> ${to.unitId}.${to.portId}`
        .replace(".primaryOutput", "")
        .replace(".primaryInput", ""),
    );
    numConnections--;
  }
  reportNumConnections();
}

function updateUnitConnectionToPort(
  bus: HostStateBus,
  from: UnitPortSpec,
  to: UnitPortSpec,
  operation: ConnectingOperation,
) {
  const srcUnit = bus.getUnit(from.unitId);
  if (!srcUnit) return;

  if (to.unitId === "$output") {
    const srcCompositePort = getUnitOutputCompositePort(srcUnit, from.portId);
    if (srcCompositePort) {
      const portSubtypes = updateConnectionCompositePortToOutput(
        bus,
        srcCompositePort,
        operation,
      );
      if (portSubtypes) {
        callUnitConnectionCallback(
          srcUnit,
          from.portId,
          operation,
          portSubtypes,
        );
        logConnectionChange(from, to, operation);
      }
    }
  } else {
    const destUnit = bus.getUnit(to.unitId);
    if (srcUnit && destUnit) {
      const srcCompositePort = getUnitOutputCompositePort(srcUnit, from.portId);
      const destCompositePort = getUnitInputCompositePort(destUnit, to.portId);
      if (srcCompositePort && destCompositePort) {
        const portSubtypes = updateConnectionBetweenCompositePort(
          srcCompositePort,
          destCompositePort,
          operation,
        );
        if (portSubtypes) {
          callUnitConnectionCallback(
            srcUnit,
            from.portId,
            operation,
            portSubtypes,
          );
          logConnectionChange(from, to, operation);
        }
      }
    }
  }
}

function extractSingleSourceCode(code: string): UnitPortSpec {
  const segments = code.split(".");
  if (segments.length === 2) {
    return { unitId: segments[0], portId: segments[1] };
  } else {
    return { unitId: code, portId: "primaryOutput" };
  }
}

function extractSingleDestCode(code: string): UnitPortSpec {
  const segments = code.split(".");
  if (segments.length === 2) {
    return { unitId: segments[0], portId: segments[1] };
  } else {
    return { unitId: code, portId: "primaryInput" };
  }
}

export function createUnitConnectionsManagerSingle(
  bus: HostStateBus,
): ConnectionManagerSingle {
  const connectionEntries = new Map<string, UnitPortConnectionEntry>();
  return {
    setConnectionSingle(source: string, destination: string, enabled: boolean) {
      const from = extractSingleSourceCode(source);
      const to = extractSingleDestCode(destination);
      const entry = createUnitPortConnectionEntry(from, to);
      const key = entry.key;
      const existingEntry = connectionEntries.get(key);
      if (!existingEntry && enabled) {
        updateUnitConnectionToPort(bus, from, to, "connectTo");
        connectionEntries.set(key, entry);
      } else if (existingEntry && !enabled) {
        updateUnitConnectionToPort(bus, from, to, "disconnectTo");
        connectionEntries.delete(key);
      }
    },
    onUnitRemoving(unitId: string) {
      const removedEntries = connectionEntries
        .entries()
        .filter(
          ([_, entry]) =>
            entry.from.unitId === unitId || entry.to.unitId === unitId,
        );
      for (const [key, entry] of removedEntries) {
        updateUnitConnectionToPort(bus, entry.from, entry.to, "disconnectTo");
        connectionEntries.delete(key);
      }
    },
  };
}

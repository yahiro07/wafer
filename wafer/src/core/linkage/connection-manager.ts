import { PortSubtype } from "../../unit-types";
import { HostStateBus } from "../host-system/host-state-bus";
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

export type ConnectionManager = {
  setConnectionChange(srcUnitId: string, destSpec: DestinationCode): void;
  onUnitRemoving(unitId: string): void;
};

type ConnectingOperation = "connectTo" | "disconnectTo";

type UnitPortSpec = {
  unitId: string | "$output";
  portId: string | "$primary";
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
): PortSubtype[] {
  const destPort = bus.audioDestinationVirtualInputPort;
  if (srcOuts.audioOutput) {
    srcOuts.audioOutput[operation](destPort);
    return ["audio"];
  }
  return [];
}

function updateConnectionBetweenCompositePort(
  srcOuts: CompositePort,
  destIns: CompositePort,
  operation: "connectTo" | "disconnectTo",
): PortSubtype[] {
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
  return portSubtypes;
}

let numConnections = 0;

function getUnitOutputCompositePort(
  unit: HsUnitInstance,
  portId: string,
): CompositePort | undefined {
  if (portId !== "$primary" && unit.additionalAudioOutputs?.[portId]) {
    return { audioOutput: unit.additionalAudioOutputs?.[portId] };
  }
  return unit.outputPorts;
}

function getUnitInputCompositePort(
  unit: HsUnitInstance,
  portId: string,
): CompositePort | undefined {
  if (portId !== "$primary" && unit.additionalAudioInputs?.[portId]) {
    return { audioInput: unit.additionalAudioInputs?.[portId] };
  }
  return unit.inputPorts;
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

function updateUnitConnectionToPort2(
  bus: HostStateBus,
  from: UnitPortSpec,
  to: UnitPortSpec,
  operation: ConnectingOperation,
) {
  const srcUnit = bus.getUnit(from.unitId);
  if (!srcUnit) return;

  if (operation === "connectTo") {
    console.log(
      `connecting ${from.unitId}.${from.portId} --> ${to.unitId}.${to.portId}`,
    );
    numConnections++;
  } else {
    console.log(
      `disconnecting ${from.unitId}.${from.portId} --> ${to.unitId}.${to.portId}`,
    );
    numConnections--;
  }

  if (to.unitId === "$output") {
    const srcCompositePort = getUnitOutputCompositePort(srcUnit, from.portId);
    if (srcCompositePort) {
      const portSubtypes = updateConnectionCompositePortToOutput(
        bus,
        srcCompositePort,
        operation,
      );
      callUnitConnectionCallback(srcUnit, from.portId, operation, portSubtypes);
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
        callUnitConnectionCallback(
          srcUnit,
          from.portId,
          operation,
          portSubtypes,
        );
      }
    }
  }
}

function extractSingleDestCode(code: string): UnitPortSpec {
  const segments = code.split(".");
  if (segments.length === 2) {
    return { unitId: segments[0], portId: segments[1] };
  } else {
    return { unitId: code, portId: "$primary" };
  }
}

function extractFanOutDestCode(code: string): UnitPortSpec[] {
  const segments = code.split("&");
  return segments.map((segment) => extractSingleDestCode(segment));
}

function buildConnectionEntries(
  srcUnitId: string,
  destSpec: DestinationCode,
): UnitPortConnectionEntry[] {
  return destSpec.split("|").flatMap((part) => {
    const segments = part.split(":");
    if (segments.length === 2) {
      const from = { unitId: srcUnitId, portId: segments[0] };
      const tos = extractFanOutDestCode(segments[1]);
      return tos.map((to) => createUnitPortConnectionEntry(from, to));
    } else if (segments.length === 1) {
      const from = { unitId: srcUnitId, portId: "$primary" };
      const tos = extractFanOutDestCode(segments[0]);
      return tos.map((to) => createUnitPortConnectionEntry(from, to));
    }
    return [];
  });
}

export function createUnitConnectionsManager(
  bus: HostStateBus,
): ConnectionManager {
  let activeConnectionEntries: UnitPortConnectionEntry[] = [];

  return {
    setConnectionChange(srcUnitId: string, destSpec: DestinationCode) {
      const unit = bus.getUnit(srcUnitId);
      if (!unit) return;

      let connectionsToAdd: UnitPortConnectionEntry[] = [];
      let connectionsToRemove: UnitPortConnectionEntry[] = [];

      if (destSpec) {
        const existingKeys = activeConnectionEntries
          .filter((entry) => entry.from.unitId === srcUnitId)
          .map((entry) => entry.key);

        const entries = buildConnectionEntries(srcUnitId, destSpec);
        const nextKeys = entries.map((entry) => entry.key);

        connectionsToAdd = entries.filter(
          (entry) => !existingKeys.includes(entry.key),
        );
        connectionsToRemove = activeConnectionEntries.filter(
          (entry) => !nextKeys.includes(entry.key),
        );
      } else {
        connectionsToRemove = activeConnectionEntries.filter(
          (entry) => entry.from.unitId === srcUnitId,
        );
      }

      for (const entry of connectionsToAdd) {
        updateUnitConnectionToPort2(bus, entry.from, entry.to, "connectTo");
      }
      for (const entry of connectionsToRemove) {
        updateUnitConnectionToPort2(bus, entry.from, entry.to, "disconnectTo");
      }
      activeConnectionEntries = [
        ...activeConnectionEntries,
        ...connectionsToAdd,
      ].filter((key) => !connectionsToRemove.includes(key));
      console.log(`numConnections: ${numConnections}`);
    },
    onUnitRemoving(unitId: string) {
      const unit = bus.getUnit(unitId);
      if (!unit) return;
      const connectionsToRemove = activeConnectionEntries.filter((entry) => {
        return entry.from.unitId === unitId || entry.to.unitId === unitId;
      });
      for (const entry of connectionsToRemove) {
        updateUnitConnectionToPort2(bus, entry.from, entry.to, "disconnectTo");
      }
      activeConnectionEntries = activeConnectionEntries.filter(
        (entry) => !connectionsToRemove.includes(entry),
      );
      console.log(`numConnections: ${numConnections}`);
    },
  };
}

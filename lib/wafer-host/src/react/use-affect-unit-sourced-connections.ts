import { useEffect } from "react";
import { DestinationCode, HostSystem } from "../core";
import {
  serializeUnitDestinationSpec,
  UnitDestinationSpec,
} from "./destination-spec";

type UnitPortSpec = {
  unitId: string;
  portId: string;
};

type ConnectionEntry = {
  source: string;
  destination: string;
};

function extractSingleDestCode(code: string): UnitPortSpec {
  const segments = code.split(".");
  if (segments.length === 2) {
    return { unitId: segments[0], portId: segments[1] };
  } else {
    return { unitId: code, portId: "primaryInput" };
  }
}

function extractFanOutDestCode(code: string): UnitPortSpec[] {
  const segments = code.split("&");
  return segments.map((segment) => extractSingleDestCode(segment));
}

function createUnitPortConnectionEntry(
  from: UnitPortSpec,
  to: UnitPortSpec,
): ConnectionEntry {
  return {
    source: `${from.unitId}.${from.portId}`,
    destination: `${to.unitId}.${to.portId}`,
  };
}

function buildConnectionEntries(
  srcUnitId: string,
  destSpec: DestinationCode,
): ConnectionEntry[] {
  return destSpec.split("|").flatMap((part) => {
    const segments = part.split(":");
    if (segments.length === 2) {
      const from = { unitId: srcUnitId, portId: segments[0] };
      const tos = extractFanOutDestCode(segments[1]);
      return tos.map((to) => createUnitPortConnectionEntry(from, to));
    } else if (segments.length === 1) {
      const from = { unitId: srcUnitId, portId: "primaryOutput" };
      const tos = extractFanOutDestCode(segments[0]);
      return tos.map((to) => createUnitPortConnectionEntry(from, to));
    }
    return [];
  });
}

export function useAffectUnitSourcedConnections(
  unitId: string,
  destSpecInput: UnitDestinationSpec | undefined,
  hostSystem: HostSystem,
) {
  const destSpec = serializeUnitDestinationSpec(destSpecInput);
  useEffect(() => {
    if (destSpec) {
      const connectionEntries = buildConnectionEntries(unitId, destSpec);
      for (const entry of connectionEntries) {
        hostSystem.linkageApi.reserveConnection(
          entry.source,
          entry.destination,
          true,
        );
      }
      return () => {
        for (const entry of connectionEntries) {
          hostSystem.linkageApi.reserveConnection(
            entry.source,
            entry.destination,
            false,
          );
        }
      };
    }
  }, [unitId, destSpec, hostSystem]);
}

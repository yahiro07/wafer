import { createEventPort } from "../../utils/event-port";
import { HsAudioInputPort, HsUnitInstance } from "../linkage/types";
import {
  ConnectionRule,
  HostStateBusImpl,
  HostSystemEvent,
  HostSystemInternalEvent,
  IAudioContext,
} from "./types";

export function createHostStateBus(
  audioContext: IAudioContext,
): HostStateBusImpl {
  const eventPort = createEventPort<HostSystemEvent>();
  const internalEventPort = createEventPort<HostSystemInternalEvent>();
  const masterGainNode = audioContext.createGain();
  masterGainNode.connect(audioContext.destination);
  const audioDestinationVirtualInputPort: HsAudioInputPort = {
    node: masterGainNode,
  };
  const units: Map<string, HsUnitInstance> = new Map();
  const unitLoadingIds: Set<string> = new Set();
  const connectionRules: ConnectionRule[] = [];

  return {
    eventPort,
    internalEventPort,
    audioContext,
    masterGainNode,
    audioDestinationVirtualInputPort,
    getUnit(unitId: string) {
      return units.get(unitId);
    },
    getAllUnits() {
      return Array.from(units.values());
    },
    getConnectionRules() {
      return connectionRules;
    },
    getUnitLoadingIds() {
      return unitLoadingIds;
    },
    units,
    unitLoadingIds,
    connectionRules,
  };
}

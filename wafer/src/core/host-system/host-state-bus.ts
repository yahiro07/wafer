import { createEventPort } from "../../utils/event-port";
import { HsAudioInputPort, HsUnitInstance } from "../linkage/types";
import { HostStateBus, HostSystemEvent, IAudioContext } from "./types";

export function createHostStateBus(audioContext: IAudioContext): HostStateBus {
  const eventPort = createEventPort<HostSystemEvent>();
  const masterGainNode = audioContext.createGain();
  masterGainNode.connect(audioContext.destination);
  const audioDestinationVirtualInputPort: HsAudioInputPort = {
    node: masterGainNode,
  };
  const units: Map<string, HsUnitInstance> = new Map();

  return {
    eventPort,
    audioContext,
    masterGainNode,
    audioDestinationVirtualInputPort,
    addUnit(unit: HsUnitInstance) {
      units.set(unit.unitId, unit);
      eventPort.emit({ type: "unitAdded", unitInstance: unit });
    },
    getUnit(unitId: string) {
      return units.get(unitId);
    },
    getAllUnits() {
      return Array.from(units.values());
    },
    removeUnit(unitId: string) {
      const unit = units.get(unitId);
      if (unit) {
        eventPort.emit({ type: "beforeRemoveUnit", unitInstance: unit });
        unit.cleanup?.();
      }
      units.delete(unitId);
      eventPort.emit({ type: "unitRemoved", unitId });
    },
  };
}

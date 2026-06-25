import { createEventPort, EventPort } from "../../utils/event-port";
import { HsAudioInputPort, HsUnitInstance } from "../linkage/types";
import { IAudioContext } from "./types";

export type HostSystemEvent =
  | { type: "loadStarted" }
  | { type: "loadCompleted" }
  | { type: "unitAdded"; unitInstance: HsUnitInstance }
  | { type: "beforeRemoveUnit"; unitInstance: HsUnitInstance }
  | { type: "unitRemoved"; unitId: string };
// | { type: "unitsAdded"; units: HsUnitInstance[] }
// | { type: "unitsRemoved"; unitIds: string[] };

export type HostStateBus = {
  eventPort: EventPort<HostSystemEvent>;
  audioContext: IAudioContext;
  masterGainNode: GainNode;
  audioDestinationVirtualInputPort: HsAudioInputPort;
  addUnit(unit: HsUnitInstance): void;
  getUnit(unitId: string): HsUnitInstance | undefined;
  getAllUnits(): HsUnitInstance[];
  removeUnit(unitId: string): void;
};

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
      }
      units.delete(unitId);
      eventPort.emit({ type: "unitRemoved", unitId });
    },
  };
}

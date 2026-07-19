import { MetaAttributes } from "../../unit-types";
import { EventPort } from "../../utils/event-port";
import {
  DestinationCode,
  HsAudioInputPort,
  HsUnitInstance,
  HsUnitInterface,
  HsUnitStateData,
} from "../linkage/types";
import { WebAudioActionScheduler } from "./webaudio-action-scheduler";

export type IAudioContext = AudioContext | OfflineAudioContext;

export type HostSystemEvent =
  | { type: "loadStarted" }
  | { type: "loadCompleted" }
  | { type: "unitAdded"; unitInstance: HsUnitInstance }
  | { type: "beforeRemoveUnit"; unitInstance: HsUnitInstance }
  | { type: "unitRemoved"; unitId: string }
  | { type: "messageFromUnit"; message: object; senderUnitId: string };

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

export type PendingUnitOperationItem = {
  type: "connection" | "state";
  op: () => void;
  // debugMetadata?: string;
};

export type UnitLoadingManager = {
  reserveLoadUnit(unitId: string, promise: Promise<HsUnitInstance>): void;
  cancelLoadUnit(promise: Promise<HsUnitInstance>): void;
  reserveUnitOperation(item: PendingUnitOperationItem): void;
};

export type HostSystemCore = {
  audioContext: IAudioContext;
  bus: HostStateBus;
  loadingManager: UnitLoadingManager;
  actionScheduler: WebAudioActionScheduler;
  emitMetaAttributes(attributes: MetaAttributes): void;
  getUnitNoteOutputMonitor(): UnitNoteOutputMonitorFn | undefined;
  setUnitNoteOutputMonitor(
    monitorFn: UnitNoteOutputMonitorFn | undefined,
  ): void;
};

export type UnitLinkageManager = {
  createUnitInterface(
    unitId: string,
    createdCallback: (unitInstance: HsUnitInstance) => void,
  ): HsUnitInterface;
  //
  registerUnitInstance(unit: HsUnitInstance): () => void;
  registerPendingUnitInstancePromise(
    unitId: string,
    unitInstancePromise: Promise<HsUnitInstance>,
  ): () => void;
  reserveConnectionSingle(source: string, destination: string): void;
  removeConnectionSingle(source: string, destination: string): void;
  reserveConnectionChange(
    srcUnitId: string,
    destSpec: DestinationCode | undefined,
  ): void;
  onUnitRemoving(unitId: string): void;
};

export type UnitNoteOutputMonitorFn = (args: {
  sourceUnitId: string;
  noteNumber: number;
  isOn: boolean;
  time?: number;
  velocity?: number;
}) => void;

//public api for host application
export type HostSystem = {
  audioContext: IAudioContext;
  eventPort: EventPort<HostSystemEvent>;
  getAllUnits(): HsUnitInstance[];
  setMasterGain(gain: number): void;
  emitMetaAttributes(attributes: MetaAttributes): void;
  getUnitState(unitId: string): HsUnitStateData | undefined;
  setUnitState(unitId: string, state: HsUnitStateData): void;
  getAllUnitStates(): HsUnitStateData[];
  setAllUnitStates(unitStates: HsUnitStateData[]): void;
  waitUnitsLoaded(): Promise<void>;
  deliverNote(args: {
    destUnitId: string;
    noteNumber: number;
    isOn: boolean;
    time?: number;
    velocity?: number;
  }): void;
  cleanup(): void;
  setUnitNoteOutputMonitor(
    monitorFn: UnitNoteOutputMonitorFn | undefined,
  ): void;
  linkageApi: UnitLinkageManager;
};

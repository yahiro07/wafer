import { MetaAttributes } from "../../unit-types";
import { EventPort } from "../../utils/event-port";
import {
  DestinationCode,
  HsAudioInputPort,
  HsUnitInstance,
  HsUnitInterface,
  HsUnitStateData,
} from "../linkage/types";

export type IAudioContext = AudioContext | OfflineAudioContext;

export type HostSystemEvent =
  | { type: "loadStarted" }
  | { type: "loadCompleted" }
  | { type: "unitAdded"; unitInstance: HsUnitInstance }
  | { type: "beforeRemoveUnit"; unitInstance: HsUnitInstance }
  | { type: "unitRemoved"; unitId: string }
  | { type: "messageFromUnit"; message: object; senderUnitId: string };

export type HostSystemInternalEvent =
  | { type: "connectionRulesChanged" }
  | { type: "unitAdded"; unitId: string }
  // | { type: "beforeRemoveUnit"; unitId: string }
  | { type: "pendingUnitsLoaded" };

export type ConnectionRule = {
  connectionKey: string; // ${srcUnitId}.${srcPortId}>${destUnitId}.${destPortId}
  // source: string; //${unitId}.${portId}
  // destination: string; //${unitId}.${portId}
  // enabled: boolean;
  srcUnitId: string;
  destUnitId: string;
};

// type ConnectionKey =

export type HostStateBus = {
  eventPort: EventPort<HostSystemEvent>;
  internalEventPort: EventPort<HostSystemInternalEvent>;
  audioContext: IAudioContext;
  masterGainNode: GainNode;
  audioDestinationVirtualInputPort: HsAudioInputPort;
  getUnit(unitId: string): HsUnitInstance | undefined;
  getAllUnits(): readonly HsUnitInstance[];
  getAllUnitsDictionary(): ReadonlyMap<string, HsUnitInstance>;
  getConnectionRules(): readonly ConnectionRule[];
  getUnitLoadingIds(): ReadonlySet<string>;
};

export type HostStateBusImpl = HostStateBus & {
  unitLoadingIds: Set<string>;
  units: Map<string, HsUnitInstance>;
  connectionRules: ConnectionRule[];
};

//deprecated
export type PendingUnitOperationItem = {
  type: "connection" | "state";
  op: () => void;
  // debugMetadata?: string;
};
//deprecated
export type UnitLoadingManager = {
  reserveLoadUnit(unitId: string, promise: Promise<HsUnitInstance>): void;
  cancelLoadUnit(promise: Promise<HsUnitInstance>): void;
  reserveUnitOperation(item: PendingUnitOperationItem): void;
};

export type HostSystemCore = {
  // audioContext: IAudioContext;
  bus: HostStateBus;
  // loadingManager: UnitLoadingManager;
  // actionScheduler: WebAudioActionScheduler;
  addUnit(unit: HsUnitInstance): void;
  removeUnit(unitId: string): void;
  pushUnitLoadingId(id: string): void;
  clearUnitLoadingId(id: string): void;
  pushConnectionRule(
    source: string,
    destination: string,
    enabled: boolean,
  ): void;
  emitMetaAttributes(attributes: MetaAttributes): void;
  // getUnitNoteOutputMonitor(): UnitNoteOutputMonitorFn | undefined;
  // setUnitNoteOutputMonitor(
  //   monitorFn: UnitNoteOutputMonitorFn | undefined,
  // ): void;
};

export type UnitLinkageManager__OldImpl = {
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

export type UnitLinkageManager = {
  cleanup(): void;
};

export type LinkageApi = {
  createUnitInterface(
    unitId: string,
    completeSetupCallback: (unitInstance: HsUnitInstance) => void,
  ): HsUnitInterface;
  registerUnitInstance(unit: HsUnitInstance): () => void;
  registerPendingUnitInstancePromise(
    unitId: string,
    unitInstancePromise: Promise<HsUnitInstance>,
  ): () => void;
  reserveConnection(
    source: string,
    destination: string,
    enabled: boolean,
  ): void;
  setClockingFrameId(id: number): void;
};

export type NoteDeliveryEvent = {
  sourcePortKey?: string;
  destPortKey: string;
  noteNumber: number;
  isOn: boolean;
  time?: number;
  velocity?: number;
};

export type NotesDispatcher = {
  pushNoteDeliveryEvent(noteDeliveryEvent: NoteDeliveryEvent): void;
  setClockingFrameId(id: number): void;
  setUnitNoteOutputMonitor(
    monitorFn: UnitNoteOutputMonitorFn | undefined,
  ): void;
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
  getAllUnits(): readonly HsUnitInstance[];
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
  linkageApi: LinkageApi;
};

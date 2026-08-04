import { useEffect, useLayoutEffect, useRef } from "react";
import { EventPort } from "./utils/event-port";
import { delayMs } from "./utils/timer-utils";

namespace ns2 {
  type UnitDestinationSpec = string;

  type HsNoteOutputPort = {};

  type HsUnitInterface = {
    createNoteOutputPort(): HsNoteOutputPort;
    completeSetup(): void;
    unload(): void;
  };

  type HsUnitInstance = {
    unitId: string;
  };

  type IAudioContext = AudioContext | OfflineAudioContext;

  type HostSystemEvent = {};

  type HsAudioInputPort = {};

  type HostSystemInternalEvent =
    | { type: "connectionRulesChanged" }
    | { type: "unitAdded"; unitId: string }
    | { type: "unitRemoved"; unitId: string }
    | { type: "pendingUnitsLoaded" };

  type ConnectionRule = {
    source: string;
    destination: string;
    enabled: boolean;
  };

  //this should not be exposed outside from HostSystem
  type HostStateBus = {
    eventPort: EventPort<HostSystemEvent>;
    internalEventPort: EventPort<HostSystemInternalEvent>;
    audioContext: IAudioContext;
    masterGainNode: GainNode;
    audioDestinationVirtualInputPort: HsAudioInputPort;
    getUnits(): HsUnitInstance[];
    getUnitById(unitId: string): HsUnitInstance | undefined;
    getConnectionRules(): ConnectionRule[];
    getUnitLoadingIds(): Set<string>;
  };

  type HostStateBusImpl = HostStateBus & {
    unitLoadingIds: Set<string>;
    units: Map<string, HsUnitInstance>;
    connectionRules: ConnectionRule[];
  };

  function createHostStateBus(): HostStateBusImpl {
    return {} as HostStateBusImpl;
  }

  type HostSystemCore = {
    bus: HostStateBus;
    pushUnitLoadingId(id: string): void;
    clearUnitLoadingId(id: string): void;
    clearUnitLoadingId(id: string): void;
    addUnit(unit: HsUnitInstance): void;
    removeUnit(unitId: string): void;
    addConnectionRule(
      source: string,
      destination: string,
      enabled: boolean,
    ): void;
  };

  function createHostSystemCore(): HostSystemCore {
    const bus = createHostStateBus();
    return {
      bus,
      pushUnitLoadingId(id) {
        bus.unitLoadingIds.add(id);
      },
      clearUnitLoadingId(id) {
        bus.unitLoadingIds.delete(id);
        if (bus.unitLoadingIds.size === 0) {
          bus.internalEventPort.emit({ type: "pendingUnitsLoaded" });
        }
      },
      addUnit(unit) {
        bus.units.set(unit.unitId, unit);
        bus.internalEventPort.emit({ type: "unitAdded", unitId: unit.unitId });
      },
      removeUnit(unitId) {
        bus.units.delete(unitId);
        bus.internalEventPort.emit({ type: "unitRemoved", unitId });
      },
      addConnectionRule(source, destination, enabled) {
        bus.connectionRules.push({ source, destination, enabled });
        bus.internalEventPort.emit({ type: "connectionRulesChanged" });
      },
    };
  }

  type NoteDeliveryEvent = {
    sourcePortKey: string;
    destPortKey: string;
    isOn: boolean;
    time?: number;
    velocity?: number;
  };

  type NotesDispatcher = {
    pushNoteDeliveryEvent(noteDeliveryEvent: NoteDeliveryEvent): void;
    setClockingFrameId(id: number): void;
  };

  function createNotesDispatcher(
    hostSystemCore: HostSystemCore,
  ): NotesDispatcher {
    return {
      pushNoteDeliveryEvent(noteDeliveryEvent) {},
      setClockingFrameId(id) {},
    };
  }

  type LinkageManager = {
    cleanup(): void;
  };
  function createLinkageManager(
    hostSystemCore: HostSystemCore,
  ): LinkageManager {
    const unsubscribeInternalEvents =
      hostSystemCore.bus.internalEventPort.subscribe((event) => {
        if (event.type === "unitAdded") {
        } else if (event.type === "connectionRulesChanged") {
        }
      });
    return {
      cleanup() {
        unsubscribeInternalEvents();
      },
    };
  }

  type LinkageApi = {
    createUnitInterface(
      unitId: string,
      completeSetupCallback: (unitInstance: HsUnitInstance) => void,
    ): HsUnitInterface;
    reserveConnection(
      source: string,
      destination: string,
      enabled: boolean,
    ): void;
    setClockingFrameId(id: number): void;
  };

  function createNoteOutputPortImpl(
    notesDispatcher: NotesDispatcher,
  ): HsNoteOutputPort {
    return {};
  }

  let seqLoadingIndex = 0;

  function createLinkageApi(
    hostSystemCore: HostSystemCore,
    notesDispatcher: NotesDispatcher,
  ): LinkageApi {
    return {
      createUnitInterface(unitId, completeSetupCallback) {
        const unitLoadingId = `${unitId}-${seqLoadingIndex++}`;
        hostSystemCore.pushUnitLoadingId(unitLoadingId);
        let disposed = false;
        return {
          createNoteOutputPort() {
            return createNoteOutputPortImpl(notesDispatcher);
          },
          completeSetup() {
            if (disposed) return;
            const unitInstance: HsUnitInstance = {
              unitId,
            };
            hostSystemCore.addUnit(unitInstance);
            hostSystemCore.clearUnitLoadingId(unitLoadingId);
            completeSetupCallback(unitInstance);
          },
          unload() {
            disposed = true;
            hostSystemCore.removeUnit(unitId);
            hostSystemCore.clearUnitLoadingId(unitLoadingId);
          },
        };
      },
      reserveConnection(source, destination, enabled) {
        hostSystemCore.addConnectionRule(source, destination, enabled);
      },
      setClockingFrameId(id) {
        notesDispatcher.setClockingFrameId(id);
      },
    };
  }

  type HostSystem = {
    deliverNote(noteDeliveryEvent: NoteDeliveryEvent): void;
    waitUnitsLoaded(): Promise<void>;
    cleanup(): void;
    linkageApi: LinkageApi;
  };

  async function waitPendingUnitsLoaded(
    hostSystemCore: HostSystemCore,
  ): Promise<void> {
    if (hostSystemCore.bus.getUnitLoadingIds().size === 0) return;
    await new Promise<void>((resolve) => {
      const unsubscribe = hostSystemCore.bus.internalEventPort.subscribe(
        (ev) => {
          if (ev.type === "pendingUnitsLoaded") {
            unsubscribe();
            resolve();
          }
        },
      );
    });
  }

  function createHostSystem(): HostSystem {
    const hostSystemCore = createHostSystemCore();
    const notesDispatcher = createNotesDispatcher(hostSystemCore);
    const linkageManager = createLinkageManager(hostSystemCore);
    const linkageApi = createLinkageApi(hostSystemCore, notesDispatcher);
    return {
      deliverNote(noteDeliveryEvent) {
        notesDispatcher.pushNoteDeliveryEvent(noteDeliveryEvent);
      },
      async waitUnitsLoaded() {
        await delayMs(200);
        await waitPendingUnitsLoaded(hostSystemCore);
      },
      cleanup() {
        linkageManager.cleanup();
      },
      linkageApi,
    };
  }

  //tick driver

  type SequencerTickDriver = {
    setBpm(bpm: number): void;
    start(): void;
    stop(): void;
  };
  function createSequencerTickDriver(
    hostSystem: HostSystem,
  ): SequencerTickDriver {
    let clockingFrameId = 0;

    return {
      setBpm() {},
      start() {
        setTimeout(() => {
          hostSystem.linkageApi.setClockingFrameId(clockingFrameId++);
          //call units scheduling
        }, 25);
      },
      stop() {},
    };
  }

  //react wrapper

  declare const useHostAppContext: () => {
    hostSystem: HostSystem;
  };
  const IFrameUnitFrame = ({
    unitId,
    pageUrl,
    destSpec,
    onUnitInstanceLoaded,
  }: {
    unitId: string;
    pageUrl: string;
    destSpec: UnitDestinationSpec;
    onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
  }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const { hostSystem } = useHostAppContext();
    useLayoutEffect(() => {
      const unitInterface = hostSystem.linkageApi.createUnitInterface(
        unitId,
        (unitInstance) => {
          onUnitInstanceLoaded?.(unitInstance);
        },
      );
      const win = iframeRef.current?.contentWindow as any;
      win.unitInterface = unitInterface;
      return () => unitInterface.unload();
    }, []);
    useEffect(() => {
      hostSystem.linkageApi.reserveConnection(unitId, destSpec, true);
    }, [destSpec]);
    return <iframe ref={iframeRef} src={pageUrl} />;
  };
}

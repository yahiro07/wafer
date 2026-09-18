import { NoteInputPort, PortSubtype } from "../../unit-types";
import { checkPortIdValidity } from "../host-system/id-format-checker";
import { oxLogger } from "../host-system/orchestration-logger";
import {
  HostSystemCore,
  IAudioContext,
  NotesDispatcher,
} from "../host-system/types";
import { safeInvoke } from "../host-system/wrap-unit-call";
import {
  AudioPort,
  HsAdditionalAudioInputPort,
  HsAdditionalAudioOutputPort,
  HsAudioInputPort,
  HsAudioOutputPort,
  HsAutomationInputPort,
  HsAutomationOutputPort,
  HsNoteOutputPort,
  HsPortInfo,
  HsUnitInstance,
  HsUnitInterface,
  HsViewSize,
} from "./types";

function createHsNoteOutputPort(
  unitId: string,
  notesDispatcher: NotesDispatcher,
): HsNoteOutputPort {
  return {
    noteOn(noteNumber, time, attrs) {
      notesDispatcher.pushNoteDeliveryEvent({
        sourcePortKey: `${unitId}.noteOutput`,
        noteNumber,
        isOn: true,
        time,
        attrs,
      });
    },
    noteOff(noteNumber, time) {
      notesDispatcher.pushNoteDeliveryEvent({
        sourcePortKey: `${unitId}.noteOutput`,
        noteNumber,
        isOn: false,
        time,
      });
    },
  };
}

function createHsAudioOutputPort(
  audioContext: IAudioContext,
): HsAudioOutputPort {
  const node = audioContext.createGain();
  return {
    node,
    connectTo(port: AudioPort) {
      node.connect(port.node);
    },
    disconnectTo(port: AudioPort) {
      node.disconnect(port.node);
    },
  };
}

function createHsAudioInputPort(audioContext: IAudioContext): HsAudioInputPort {
  const node = audioContext.createGain();
  return { node };
}

function createHsAdditionalAudioOutputPort(
  audioContext: IAudioContext,
  id: string,
  label?: string,
): HsAdditionalAudioOutputPort {
  const node = audioContext.createGain();
  return {
    id,
    label,
    node,
    connectTo(port: AudioPort) {
      node.connect(port.node);
    },
    disconnectTo(port: AudioPort) {
      node.disconnect(port.node);
    },
  };
}

function createHsAdditionalAudioInputPort(
  audioContext: IAudioContext,
  id: string,
  label?: string,
): HsAdditionalAudioInputPort {
  const node = audioContext.createGain();
  return { node, id, label };
}

function createHsAutomationOutputPort(
  unitId: string,
  notesDispatcher: NotesDispatcher,
  portId: string,
  label?: string,
): HsAutomationOutputPort {
  return {
    emitValue(value, options) {
      notesDispatcher.pushAutomationDeliveryEvent({
        sourcePortKey: `${unitId}.${portId}`,
        value,
        options,
      });
    },
    id: portId,
    label,
  };
}

function createNoteInputWrapper(
  noteInput: NoteInputPort,
  unitId: string,
): NoteInputPort {
  return {
    noteOn(noteNumber, time, velocity) {
      oxLogger.noteReceived({
        unitIdFrom: "??",
        unitIdTo: unitId,
        noteNumber,
        isOn: true,
        time,
        noteId: "??",
      });
      safeInvoke(noteInput.noteOn)?.(noteNumber, time, velocity);
    },
    noteOff(noteNumber, time) {
      oxLogger.noteReceived({
        unitIdFrom: "??",
        unitIdTo: unitId,
        noteNumber,
        isOn: false,
        time,
        noteId: "??",
      });
      safeInvoke(noteInput.noteOff)?.(noteNumber, time);
    },
  };
}

function buildPortInfos(
  primaryInputPorts: HsUnitInstance["primaryInputPorts"],
  primaryOutputPorts: HsUnitInstance["primaryOutputPorts"],
  additionalAudioInputs: HsUnitInstance["additionalAudioInputs"],
  additionalAudioOutputs: HsUnitInstance["additionalAudioOutputs"],
  automationInput: HsAutomationInputPort | undefined,
  automationOutputs: HsUnitInstance["automationOutputs"],
): HsPortInfo[] {
  const primaryOutputSubtypes = [
    primaryOutputPorts.audioOutput && "audio",
    primaryOutputPorts.noteOutput && "note",
  ].filter(Boolean) as PortSubtype[];
  const primaryInputSubtypes = [
    primaryInputPorts.audioInput && "audio",
    primaryInputPorts.noteInput && "note",
  ].filter(Boolean) as PortSubtype[];
  return [
    primaryOutputSubtypes.length > 0
      ? {
          type: "primary",
          direction: "output",
          subtypes: primaryOutputSubtypes,
          portId: "primaryOutput",
        }
      : undefined,
    primaryInputSubtypes.length > 0
      ? {
          type: "primary",
          direction: "input",
          subtypes: primaryInputSubtypes,
          portId: "primaryInput",
        }
      : undefined,
    primaryOutputPorts.audioOutput && {
      type: "primaryInner",
      direction: "output",
      subtype: "audio",
      portId: "audioOutput",
    },
    primaryOutputPorts.noteOutput && {
      type: "primaryInner",
      direction: "output",
      subtype: "note",
      portId: "noteOutput",
    },
    primaryInputPorts.audioInput && {
      type: "primaryInner",
      direction: "input",
      subtype: "audio",
      portId: "audioInput",
    },
    primaryInputPorts.noteInput && {
      type: "primaryInner",
      direction: "input",
      subtype: "note",
      portId: "noteInput",
    },
    automationInput && {
      type: "additional",
      direction: "input",
      subtype: "automation",
      portId: "automationInput",
    },
    ...(automationOutputs
      ? Object.values(automationOutputs).map((port) => ({
          type: "additional",
          direction: "output",
          subtype: "automation",
          portId: port.id,
          label: port.label,
        }))
      : []),
    ...(additionalAudioOutputs
      ? Object.values(additionalAudioOutputs).map((port) => ({
          type: "additional",
          direction: "output",
          subtype: "audio",
          portId: port.id,
          label: port.label,
        }))
      : []),
    ...(additionalAudioInputs
      ? Object.values(additionalAudioInputs).map((port) => ({
          type: "additional",
          direction: "input",
          subtype: "audio",
          portId: port.id,
          label: port.label,
        }))
      : []),
  ].filter(Boolean) as HsPortInfo[];
}

function makeSequentialPortId(existingIds: string[], prefix: string) {
  for (let i = 1; ; i++) {
    const candidateId = i === 1 ? prefix : `${prefix}${i}`;
    if (!existingIds.includes(candidateId)) return candidateId;
  }
}

export function createUnitInterface(
  hostSystemCore: HostSystemCore,
  notesDispatcher: NotesDispatcher,
  unitId: string,
  createdCallback: (unitInstance: HsUnitInstance) => void,
): HsUnitInterface {
  let cancelled = false;

  const { audioContext } = hostSystemCore.bus;
  let audioOutputPort: HsAudioOutputPort | undefined;
  let audioInputPort: HsAudioInputPort | undefined;
  let noteOutputPort: HsNoteOutputPort | undefined;
  let additionalAudioOutputs:
    | Record<string, HsAdditionalAudioOutputPort>
    | undefined;
  let additionalAudioInputs:
    | Record<string, HsAdditionalAudioInputPort>
    | undefined;
  let automationOutputPorts: Record<string, HsAutomationOutputPort> | undefined;

  let portsFixed = false;

  let latestViewSize: HsViewSize | undefined;
  type ViewSizeListener = (viewSize: HsViewSize) => void;
  const viewSizeListeners = new Set<ViewSizeListener>();

  const setViewSizeInternal = (size: HsViewSize) => {
    viewSizeListeners.forEach((fn) => fn(size));
    latestViewSize = size;
  };

  function raiseIfInvalidPortsAccess(message: string) {
    if (portsFixed) {
      // throw new Error(message);
      console.warn(message);
    }
  }

  return {
    audioContext: audioContext as AudioContext,
    get audioOutputNode() {
      if (!audioOutputPort) {
        raiseIfInvalidPortsAccess(
          `unitInterface.audioOutputNode accessed first time after completeSetup, please call it before completeSetup`,
        );
        audioOutputPort = createHsAudioOutputPort(audioContext);
      }
      return audioOutputPort.node;
    },
    get audioInputNode() {
      if (!audioInputPort) {
        raiseIfInvalidPortsAccess(
          `unitInterface.audioInputNode accessed first time after completeSetup, please call it before completeSetup`,
        );
        audioInputPort = createHsAudioInputPort(audioContext);
      }
      return audioInputPort.node;
    },
    createNoteOutputPort() {
      raiseIfInvalidPortsAccess(
        "unitInterface.createNoteOutputPort cannot be called after completeSetup",
      );
      noteOutputPort = createHsNoteOutputPort(unitId, notesDispatcher);
      return noteOutputPort;
    },
    createAdditionalAudioOutputNode(id, label) {
      raiseIfInvalidPortsAccess(
        "unitInterface.createAdditionalAudioOutputNode cannot be called after completeSetup",
      );
      checkPortIdValidity(id);
      const port = createHsAdditionalAudioOutputPort(audioContext, id, label);
      additionalAudioOutputs ??= {};
      additionalAudioOutputs[id] = port;
      return port.node;
    },
    createAdditionalAudioInputNode(id, label) {
      raiseIfInvalidPortsAccess(
        "unitInterface.createAdditionalAudioInputNode cannot be called after completeSetup",
      );
      checkPortIdValidity(id);
      const port = createHsAdditionalAudioInputPort(audioContext, id, label);
      additionalAudioInputs ??= {};
      additionalAudioInputs[id] = port;
      return port.node;
    },
    createAutomationOutputPort(id, label) {
      raiseIfInvalidPortsAccess(
        "unitInterface.createAutomationOutputPort cannot be called after completeSetup",
      );
      if (id) {
        checkPortIdValidity(id);
        if (automationOutputPorts?.[id]) {
          console.warn(`duplicated automation output port id: ${id}`);
        }
      } else {
        id = makeSequentialPortId(
          Object.keys(automationOutputPorts ?? {}),
          "automationOutput",
        );
      }
      const port = createHsAutomationOutputPort(
        unitId,
        notesDispatcher,
        id,
        label,
      );
      automationOutputPorts ??= {};
      automationOutputPorts[id] = port;
      return port;
    },
    emitMetaAttributes(metaAttrs) {
      hostSystemCore.emitMetaAttributes(metaAttrs);
    },
    sendMessageToHost(message) {
      const primaryHandler = hostSystemCore.bus.messagesFromUnitsPrimaryHandler;
      const result = primaryHandler?.(message, unitId);
      hostSystemCore.bus.eventPort.emit({
        type: "messageFromUnit",
        unitId,
        message,
      });
      return result;
    },
    setViewSize(width, height, preferJustSize) {
      setViewSizeInternal({ width, height, preferJustSize });
    },
    completeSetup(attrs) {
      if (cancelled) return;
      const primaryInputPorts = {
        audioInput: audioInputPort,
        noteInput: attrs.noteInput
          ? createNoteInputWrapper(attrs.noteInput, unitId)
          : undefined,
      };
      const primaryOutputPorts = {
        audioOutput: audioOutputPort,
        noteOutput: noteOutputPort,
      };
      const automationInputPort = attrs.automationInput;
      const portInfos = buildPortInfos(
        primaryInputPorts,
        primaryOutputPorts,
        additionalAudioInputs,
        additionalAudioOutputs,
        automationInputPort,
        automationOutputPorts,
      );

      const subscribeViewSize = (fn: ViewSizeListener) => {
        if (latestViewSize) {
          fn(latestViewSize);
        }
        viewSizeListeners.add(fn);
        return () => {
          viewSizeListeners.delete(fn);
        };
      };

      const unitInstance: HsUnitInstance = {
        unitId,
        primaryInputPorts: primaryInputPorts,
        primaryOutputPorts: primaryOutputPorts,
        additionalAudioOutputs,
        additionalAudioInputs,
        automationInput: automationInputPort,
        automationOutputs: automationOutputPorts,
        hostCallbacks: attrs.hostCallbacks,
        clockHandlers: attrs.clockHandlers,
        persistence: attrs.persistence,
        unitCallbacks: attrs.unitCallbacks,
        portInfos,
        subscribeViewSize,
        presetProvider: attrs.presetProvider,
        cleanup: attrs.cleanup,
      };
      createdCallback(unitInstance);

      if (attrs.unitAspects.viewSize) {
        const [width, height] = attrs.unitAspects.viewSize;
        const preferJustSize = attrs.unitAspects.preferJustSize ?? false;
        setViewSizeInternal({ width, height, preferJustSize });
      }
      portsFixed = true;
    },
    cancelLoading() {
      cancelled = true;
    },
  };
}

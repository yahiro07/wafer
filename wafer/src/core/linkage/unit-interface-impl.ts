import { AutomationPort, NotePort, PortSubtype } from "../../unit-types";
import { checkPortIdValidity } from "../host-system/id-format-checker";
import { oxLogger } from "../host-system/orchestration-logger";
import {
  HostSystemCore,
  IAudioContext,
  UnitNoteOutputMonitorFn,
} from "../host-system/types";
import { WebAudioActionScheduler } from "../host-system/webaudio-action-scheduler";
import {
  AudioPort,
  HsAdditionalAudioInputPort,
  HsAdditionalAudioOutputPort,
  HsAudioInputPort,
  HsAudioOutputPort,
  HsAutomationOutputPort,
  HsNoteOutputPort,
  HsPortInfo,
  HsUnitInstance,
  HsUnitInterface,
} from "./types";

let seqNoteId = 0;

function createHsNoteOutputPort(
  actionScheduler: WebAudioActionScheduler,
  unitId: string,
  getUnitNoteOutputMonitor: () => UnitNoteOutputMonitorFn | undefined,
): HsNoteOutputPort {
  const connectedInputPorts = new Set<NotePort>();
  const noteIdsMap = new Map<number, string>();
  // let emitting = false;
  return {
    connectTo(port: NotePort) {
      connectedInputPorts.add(port);
    },
    disconnectTo(port: NotePort) {
      connectedInputPorts.delete(port);
    },
    noteOn(noteNumber, time, velocity) {
      const monitorFn = getUnitNoteOutputMonitor();
      if (monitorFn) {
        const sourceUnitId = unitId;
        monitorFn({ sourceUnitId, noteNumber, isOn: true, time, velocity });
      }
      const noteId = `n${(seqNoteId++).toString().padStart(3, "0")}`;
      // if (emitting) return; //avoid recursive call
      // emitting = true;
      oxLogger.noteEmit({
        unitIdFrom: unitId,
        unitIdTo: "??",
        noteNumber,
        isOn: true,
        time,
        noteId,
      });
      noteIdsMap.set(noteNumber, noteId);
      actionScheduler.pushAction(() => {
        connectedInputPorts.forEach((connectedInputPort) => {
          connectedInputPort.noteOn(noteNumber, time, velocity);
        });
      }, time);
      // emitting = false;
    },
    noteOff(noteNumber, time) {
      const monitorFn = getUnitNoteOutputMonitor();
      if (monitorFn) {
        const sourceUnitId = unitId;
        monitorFn({ sourceUnitId, noteNumber, isOn: false, time });
      }
      const noteId = noteIdsMap.get(noteNumber);
      // if (emitting) return; //avoid recursive call
      // emitting = true;
      oxLogger.noteEmit({
        unitIdFrom: unitId,
        unitIdTo: "??",
        noteNumber,
        isOn: false,
        time,
        noteId: noteId ?? "??",
      });
      noteIdsMap.delete(noteNumber);
      actionScheduler.pushAction(() => {
        connectedInputPorts.forEach((connectedInputPort) => {
          connectedInputPort.noteOff(noteNumber, time);
        });
      }, time);
      // emitting = false;
    },
  };
}

function createHsAutomationOutputPort(
  actionScheduler: WebAudioActionScheduler,
): HsAutomationOutputPort {
  let connectedInputPort: AutomationPort | undefined;
  return {
    connectTo(port: AutomationPort) {
      connectedInputPort = port;
    },
    disconnectTo(port: AutomationPort) {
      if (connectedInputPort === port) {
        connectedInputPort = undefined;
      }
    },
    getParameterSpecs() {
      return connectedInputPort?.getParameterSpecs() ?? [];
    },
    getParameter(id: string) {
      return connectedInputPort?.getParameter(id);
    },
    setParameter(id: string, value: number, time?: number) {
      actionScheduler.pushAction(() => {
        connectedInputPort?.setParameter(id, value, time);
      }, time);
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

function createNoteInputWrapper(noteInput: NotePort, unitId: string): NotePort {
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
      noteInput.noteOn(noteNumber, time, velocity);
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
      noteInput.noteOff(noteNumber, time);
    },
  };
}

function buildPortInfos(
  primaryInputPorts: HsUnitInstance["primaryInputPorts"],
  primaryOutputPorts: HsUnitInstance["primaryOutputPorts"],
  additionalAudioOutputs: HsUnitInstance["additionalAudioOutputs"],
  additionalAudioInputs: HsUnitInstance["additionalAudioInputs"],
): HsPortInfo[] {
  const primaryOutputSubtypes = [
    primaryOutputPorts.audioOutput && "audio",
    primaryOutputPorts.noteOutput && "note",
    primaryOutputPorts.automationOutput && "automation",
  ].filter(Boolean) as PortSubtype[];
  const primaryInputSubtypes = [
    primaryInputPorts.audioInput && "audio",
    primaryInputPorts.noteInput && "note",
    primaryInputPorts.automationInput && "automation",
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
    primaryOutputPorts.automationOutput && {
      type: "primaryInner",
      direction: "output",
      subtype: "automation",
      portId: "automationOutput",
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
    primaryInputPorts.automationInput && {
      type: "primaryInner",
      direction: "input",
      subtype: "automation",
      portId: "automationInput",
    },
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

export function createUnitInterface(
  hostSystemCore: HostSystemCore,
  unitId: string,
  createdCallback: (unitInstance: HsUnitInstance) => void,
): HsUnitInterface {
  const { audioContext } = hostSystemCore;
  let audioOutputPort: HsAudioOutputPort | undefined;
  let audioInputPort: HsAudioInputPort | undefined;
  let noteOutputPort: HsNoteOutputPort | undefined;
  let automationOutputPort: HsAutomationOutputPort | undefined;
  let additionalAudioOutputs:
    | Record<string, HsAdditionalAudioOutputPort>
    | undefined;
  let additionalAudioInputs:
    | Record<string, HsAdditionalAudioInputPort>
    | undefined;
  let portsFixed = false;

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
      noteOutputPort = createHsNoteOutputPort(
        hostSystemCore.actionScheduler,
        unitId,
        hostSystemCore.getUnitNoteOutputMonitor,
      );
      return noteOutputPort;
    },
    createAutomationOutputPort() {
      raiseIfInvalidPortsAccess(
        "unitInterface.createAutomationOutputPort cannot be called after completeSetup",
      );
      automationOutputPort = createHsAutomationOutputPort(
        hostSystemCore.actionScheduler,
      );
      return automationOutputPort;
    },
    createAdditionalAudioOutputNode(id: string, label?: string) {
      checkPortIdValidity(id);
      const port = createHsAdditionalAudioOutputPort(audioContext, id, label);
      additionalAudioOutputs ??= {};
      additionalAudioOutputs[id] = port;
      return port.node;
    },
    createAdditionalAudioInputNode(id: string, label?: string) {
      checkPortIdValidity(id);
      const port = createHsAdditionalAudioInputPort(audioContext, id, label);
      additionalAudioInputs ??= {};
      additionalAudioInputs[id] = port;
      return port.node;
    },
    emitMetaAttributes(metaAttrs) {
      hostSystemCore.emitMetaAttributes(metaAttrs);
    },
    sendMessageToHost(message) {
      hostSystemCore.bus.eventPort.emit({
        type: "messageFromUnit",
        message,
        senderUnitId: unitId,
      });
    },
    completeSetup(attrs) {
      const primaryInputPorts = {
        audioInput: audioInputPort,
        noteInput: attrs.noteInput
          ? createNoteInputWrapper(attrs.noteInput, unitId)
          : undefined,
        automationInput: attrs.automationInput,
      };
      const primaryOutputPorts = {
        audioOutput: audioOutputPort,
        noteOutput: noteOutputPort,
        automationOutput: automationOutputPort,
      };
      const portInfos = buildPortInfos(
        primaryInputPorts,
        primaryOutputPorts,
        additionalAudioOutputs,
        additionalAudioInputs,
      );

      createdCallback({
        unitId,
        viewSize: attrs.unitAspects.viewSize,
        primaryInputPorts: primaryInputPorts,
        primaryOutputPorts: primaryOutputPorts,
        additionalAudioOutputs,
        additionalAudioInputs,
        hostCallbacks: attrs.hostCallbacks,
        clockHandlers: attrs.clockHandlers,
        persistence: attrs.persistence,
        unitCallbacks: attrs.unitCallbacks,
        portInfos,
        cleanup: attrs.cleanup,
      });
      portsFixed = true;
    },
  };
}

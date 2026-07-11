import { AutomationPort, NotePort } from "../../unit-types";
import { HostSystem } from "../host-system/host-system";
import { checkPortIdValidity } from "../host-system/id-format-checker";
import { IAudioContext, UnitNoteOutputMonitorFn } from "../host-system/types";
import { WebAudioActionScheduler } from "../host-system/webaudio-action-scheduler";
import {
  AudioPort,
  HsAdditionalAudioInputPort,
  HsAdditionalAudioOutputPort,
  HsAudioInputPort,
  HsAudioOutputPort,
  HsAutomationOutputPort,
  HsClockInputPort,
  HsClockOutputPort,
  HsNoteOutputPort,
  HsUnitInstance,
  HsUnitInterface,
} from "./types";

function createHsNoteOutputPort(
  actionScheduler: WebAudioActionScheduler,
  unitId: string,
  getUnitNoteOutputMonitor: () => UnitNoteOutputMonitorFn | undefined,
): HsNoteOutputPort {
  const connectedInputPorts = new Set<NotePort>();
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
      actionScheduler.pushAction(() => {
        connectedInputPorts.forEach((connectedInputPort) => {
          connectedInputPort.noteOn(noteNumber, time, velocity);
        });
      }, time);
    },
    noteOff(noteNumber, time) {
      const monitorFn = getUnitNoteOutputMonitor();
      if (monitorFn) {
        const sourceUnitId = unitId;
        monitorFn({ sourceUnitId, noteNumber, isOn: false, time });
      }
      actionScheduler.pushAction(() => {
        connectedInputPorts.forEach((connectedInputPort) => {
          connectedInputPort.noteOff(noteNumber, time);
        });
      }, time);
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

function createHsClockOutputPort(): HsClockOutputPort {
  const connectedInputPorts = new Set<HsClockInputPort>();
  return {
    connectTo(port: HsClockInputPort) {
      connectedInputPorts.add(port);
    },
    disconnectTo(port: HsClockInputPort) {
      connectedInputPorts.delete(port);
    },
    start() {
      connectedInputPorts.forEach((connectedInputPort) => {
        connectedInputPort.start?.();
      });
    },
    stop() {
      connectedInputPorts.forEach((connectedInputPort) => {
        connectedInputPort.stop?.();
      });
    },
    processScheduling(timeFrom, barFrom, barTo, bpm) {
      connectedInputPorts.forEach((connectedInputPort) => {
        connectedInputPort.processScheduling?.(timeFrom, barFrom, barTo, bpm);
      });
    },
    processStep(stepIndex, time, unitDuration) {
      connectedInputPorts.forEach((connectedInputPort) => {
        connectedInputPort.processStep?.(stepIndex, time, unitDuration);
      });
    },
  };
}

export function createUnitInterface(
  hostSystem: HostSystem,
  unitId: string,
  createdCallback: (unitInstance: HsUnitInstance) => void,
): HsUnitInterface {
  const { audioContext } = hostSystem;
  const audioOutputPort = createHsAudioOutputPort(audioContext);
  const audioInputPort = createHsAudioInputPort(audioContext);
  const { linkageApi } = hostSystem;
  const noteOutputPort = createHsNoteOutputPort(
    linkageApi.actionScheduler,
    unitId,
    linkageApi.getUnitNoteOutputMonitor,
  );
  const automationOutputPort = createHsAutomationOutputPort(
    linkageApi.actionScheduler,
  );
  const additionalAudioOutputs: Record<string, HsAdditionalAudioOutputPort> =
    {};
  const additionalAudioInputs: Record<string, HsAdditionalAudioInputPort> = {};

  let clockOutputPort: HsClockOutputPort | undefined;

  return {
    audioContext: audioContext as AudioContext,
    audioOutputNode: audioOutputPort.node,
    audioInputNode: audioInputPort.node,
    noteOutputPort,
    automationOutputPort,
    createAdditionalAudioOutputNode(id: string, label?: string) {
      checkPortIdValidity(id);
      const port = createHsAdditionalAudioOutputPort(audioContext, id, label);
      additionalAudioOutputs[id] = port;
      return port.node;
    },
    createAdditionalAudioInputNode(id: string, label?: string) {
      checkPortIdValidity(id);
      const port = createHsAdditionalAudioInputPort(audioContext, id, label);
      additionalAudioInputs[id] = port;
      return port.node;
    },
    createClockOutputPort() {
      const port = createHsClockOutputPort();
      clockOutputPort = port;
      return port;
    },
    emitMetaAttributes(metaAttrs) {
      hostSystem.emitMetaAttributes(metaAttrs);
    },
    sendMessageToHost(message) {
      hostSystem.linkageApi.eventPort.emit({
        type: "messageFromUnit",
        message,
        senderUnitId: unitId,
      });
    },
    completeSetup(attrs) {
      const hasAudioOutput = attrs.unitAspects.outputs?.includes("audio");
      const hasAudioInput = attrs.unitAspects.inputs?.includes("audio");
      const hasNoteOutput = attrs.unitAspects.outputs?.includes("note");
      const hasNoteInput = attrs.unitAspects.inputs?.includes("note");
      const hasAutomationOutput =
        attrs.unitAspects.outputs?.includes("automation");
      const hasAutomationInput =
        attrs.unitAspects.inputs?.includes("automation");

      const additionalAudioOutputsMap =
        Object.keys(additionalAudioOutputs).length > 0
          ? additionalAudioOutputs
          : undefined;
      const additionalAudioInputsMap =
        Object.keys(additionalAudioInputs).length > 0
          ? additionalAudioInputs
          : undefined;

      createdCallback({
        unitId,
        viewSize: attrs.unitAspects.viewSize,
        inputPorts: {
          audioInput: hasAudioInput ? audioInputPort : undefined,
          noteInput: hasNoteInput ? attrs.noteInput : undefined,
          automationInput: hasAutomationInput
            ? attrs.automationInput
            : undefined,
        },
        outputPorts: {
          audioOutput: hasAudioOutput ? audioOutputPort : undefined,
          noteOutput: hasNoteOutput ? noteOutputPort : undefined,
          automationOutput: hasAutomationOutput
            ? automationOutputPort
            : undefined,
        },
        additionalAudioOutputs: additionalAudioOutputsMap,
        additionalAudioInputs: additionalAudioInputsMap,
        clockOutputPort,
        hostCallbacks: attrs.hostCallbacks,
        clockHandlers: attrs.clockHandlers,
        persistence: attrs.persistence,
        unitCallbacks: attrs.unitCallbacks,
        cleanup: attrs.cleanup,
      });
    },
  };
}

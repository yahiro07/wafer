import { AutomationPort, NotePort, UnitInterface } from "../../unit-types";
import { HostSystem } from "../host-system/host-system";
import { IAudioContext, UnitNoteOutputMonitorFn } from "../host-system/types";
import { WebAudioActionScheduler } from "../host-system/webaudio-action-scheduler";
import {
  AudioPort,
  HsAdditionalAudioInputPort,
  HsAdditionalAudioOutputPort,
  HsAudioInputPort,
  HsAudioOutputPort,
  HsAutomationOutputPort,
  HsNoteOutputPort,
  HsUnitInstance,
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

export function createUnitInterface(
  hostSystem: HostSystem,
  unitId: string,
  createdCallback: (unitInstance: HsUnitInstance) => void,
): UnitInterface {
  const { audioContext } = hostSystem;
  const audioOutputPort = createHsAudioOutputPort(audioContext);
  const audioInputPort = createHsAudioInputPort(audioContext);
  const noteOutputPort = createHsNoteOutputPort(
    hostSystem.actionScheduler,
    unitId,
    hostSystem.getUnitNoteOutputMonitor,
  );
  const automationOutputPort = createHsAutomationOutputPort(
    hostSystem.actionScheduler,
  );
  const additionalAudioOutputs: Record<string, HsAdditionalAudioOutputPort> =
    {};
  const additionalAudioInputs: Record<string, HsAdditionalAudioInputPort> = {};

  return {
    audioContext: audioContext as AudioContext,
    audioOutputNode: audioOutputPort.node,
    audioInputNode: audioInputPort.node,
    noteOutputPort,
    automationOutputPort,
    createAdditionalAudioOutputNode(id: string, label?: string) {
      const port = createHsAdditionalAudioOutputPort(audioContext, id, label);
      additionalAudioOutputs[id] = port;
      return port.node;
    },
    createAdditionalAudioInputNode(id: string, label?: string) {
      const port = createHsAdditionalAudioInputPort(audioContext, id, label);
      additionalAudioInputs[id] = port;
      return port.node;
    },
    emitMetaAttributes(metaAttrs) {
      hostSystem.emitMetaAttributes(metaAttrs);
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
        hostCallbacks: attrs.hostCallbacks,
        clockHandlers: attrs.clockHandlers,
        persistence: attrs.persistence,
        unitCallbacks: attrs.unitCallbacks,
      });
    },
  };
}

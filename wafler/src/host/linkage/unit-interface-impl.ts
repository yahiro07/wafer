import { NotePort, UnitInterface } from "../../unit-types";
import { HostSystem } from "../core/host-system";
import { WebAudioActionScheduler } from "../core/webaudio-action-scheduler";
import {
  AudioPort,
  HsAudioInputPort,
  HsAudioOutputPort,
  HsNoteOutputPort,
  HsUnitInstance,
} from "./types";

function createHsNoteOutputPort(
  actionScheduler: WebAudioActionScheduler,
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
      actionScheduler.pushAction(() => {
        connectedInputPorts.forEach((connectedInputPort) => {
          connectedInputPort.noteOn(noteNumber, time, velocity);
        });
      }, time);
    },
    noteOff(noteNumber, time) {
      actionScheduler.pushAction(() => {
        connectedInputPorts.forEach((connectedInputPort) => {
          connectedInputPort.noteOff(noteNumber, time);
        });
      }, time);
    },
  };
}

function createHsAudioInputPort(audioContext: AudioContext): HsAudioInputPort {
  const node = audioContext.createGain();
  return { node };
}

function createHsAudioOutputPort(
  audioContext: AudioContext,
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

export function createUnitInterface(
  hostSystem: HostSystem,
  unitId: string,
  createdCallback: (unitInstance: HsUnitInstance) => void,
): UnitInterface {
  const { audioContext } = hostSystem;
  const audioOutputPort = createHsAudioOutputPort(audioContext);
  const audioInputPort = createHsAudioInputPort(audioContext);
  const noteOutputPort = createHsNoteOutputPort(hostSystem.actionScheduler);
  return {
    audioContext,
    audioOutputNode: audioOutputPort.node,
    audioInputNode: audioInputPort.node,
    noteOutputPort,
    emitMetaAttributes(metaAttrs) {
      hostSystem.emitMetaAttributes(metaAttrs);
    },
    completeSetup(attrs) {
      const hasAudioOutput = attrs.unitAspects.outputs?.includes("audio");
      const hasAudioInput = attrs.unitAspects.inputs?.includes("audio");
      const hasNoteOutput = attrs.unitAspects.outputs?.includes("note");
      const hasNoteInput = attrs.unitAspects.inputs?.includes("note");

      createdCallback({
        unitId,
        inputPorts: {
          audioInput: hasAudioInput ? audioInputPort : undefined,
          noteInput: hasNoteInput ? attrs.noteInput : undefined,
        },
        outputPorts: {
          audioOutput: hasAudioOutput ? audioOutputPort : undefined,
          noteOutput: hasNoteOutput ? noteOutputPort : undefined,
        },
        hostCallbacks: attrs.hostCallbacks,
        clockHandlers: attrs.clockHandlers,
        persistence: attrs.persistence,
      });
    },
  };
}

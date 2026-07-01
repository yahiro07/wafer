import { ReactNode } from "react";
import {
  AutomationPort,
  ClockHandlers,
  HostCallbacks,
  NotePort,
  Persistence,
  UnitCallbacks,
} from "../../unit-types";

export type AudioPort = { node: AudioNode };

export type HsUnitStateData =
  | { unitId: string; type: "bytes"; base64: string }
  | { unitId: string; type: "json"; json: Record<string, any> };

export type HsAudioInputPort = AudioPort;
export type HsNoteInputPort = NotePort;
export type HsAutomationInputPort = AutomationPort;

type WrapperOutputPort<T> = T & {
  connectTo(port: T): void;
  disconnectTo(port: T): void;
};
export type HsNoteOutputPort = WrapperOutputPort<NotePort>;
export type HsAudioOutputPort = WrapperOutputPort<AudioPort>;
export type HsAutomationOutputPort = WrapperOutputPort<AutomationPort>;

export type HsUnitInstance = {
  unitId: string;
  inputPorts: {
    audioInput?: AudioPort;
    noteInput?: NotePort;
    automationInput?: AutomationPort;
  };
  outputPorts: {
    audioOutput?: HsAudioOutputPort;
    noteOutput?: HsNoteOutputPort;
    automationOutput?: HsAutomationOutputPort;
  };
  hostCallbacks?: HostCallbacks;
  clockHandlers?: ClockHandlers;
  persistence?: Persistence;
  unitCallbacks?: UnitCallbacks;
  RenderUi?: () => ReactNode;
};

export type DestinationCode = string;

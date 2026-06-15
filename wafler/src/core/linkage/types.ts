import { ReactNode } from "react";
import {
  ClockHandlers,
  HostCallbacks,
  NotePort,
  Persistence,
} from "../../unit-types";

export type AudioPort = { node: AudioNode };

export type HsUnitStateData =
  | { unitId: string; type: "bytes"; base64: string }
  | { unitId: string; type: "json"; json: Record<string, any> };

export type HsAudioInputPort = AudioPort;
export type HsNoteInputPort = NotePort;

type WrapperOutputPort<T> = T & {
  connectTo(port: T): void;
  disconnectTo(port: T): void;
};
export type HsNoteOutputPort = WrapperOutputPort<NotePort>;
export type HsAudioOutputPort = WrapperOutputPort<AudioPort>;

export type HsUnitInstance = {
  unitId: string;
  inputPorts: {
    audioInput?: AudioPort;
    noteInput?: NotePort;
  };
  outputPorts: {
    audioOutput?: HsAudioOutputPort;
    noteOutput?: HsNoteOutputPort;
  };
  hostCallbacks?: HostCallbacks;
  clockHandlers?: ClockHandlers;
  persistence?: Persistence;
  RenderUi?: () => ReactNode;
};

export type DestinationCode = string;

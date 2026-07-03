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

export type HsAdditionalAudioPort = {
  node: AudioNode;
  id: string;
  label?: string;
};

export type HsUnitStateData =
  | { unitId: string; type: "bytes"; base64: string }
  | { unitId: string; type: "json"; json: Record<string, any> };

export type HsAudioInputPort = AudioPort;
export type HsNoteInputPort = NotePort;
export type HsAutomationInputPort = AutomationPort;
export type HsAdditionalAudioInputPort = HsAdditionalAudioPort;

type WrapperOutputPort<T> = T & {
  connectTo(port: T): void;
  disconnectTo(port: T): void;
};
export type HsNoteOutputPort = WrapperOutputPort<NotePort>;
export type HsAudioOutputPort = WrapperOutputPort<AudioPort>;
export type HsAutomationOutputPort = WrapperOutputPort<AutomationPort>;
export type HsAdditionalAudioOutputPort =
  WrapperOutputPort<HsAdditionalAudioPort>;

export type HsUnitInstance = {
  unitId: string;
  viewSize?: [number, number];
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
  additionalAudioOutputs?: Record<string, HsAdditionalAudioOutputPort>;
  additionalAudioInputs?: Record<string, HsAdditionalAudioPort>;
  hostCallbacks?: HostCallbacks;
  clockHandlers?: ClockHandlers;
  persistence?: Persistence;
  unitCallbacks?: UnitCallbacks;
  RenderUi?: () => ReactNode;
};

/*
destSpec="unit1"        //self.primaryOutputPort --> unit1.primaryInputPort
destSpec="unit1.port1"  //self.primaryOutputPort --> unit1.port1
destSpec="unit1&unit2"  //self.primaryOutputPort --> unit1.primaryInputPort, unit2.primaryInputPort
destSpec="port1:unit2"  //self.port1 --> unit2.primaryInputPort
desSpec="unit1&unit2|port1:unit3.port2&unit4"
//self.primaryOutputPort --> unit1.primaryInputPort, unit2.primaryInputPort
//self.port1 --> unit3.port2, unit4.primaryInputPort
*/
export type DestinationCode = string;

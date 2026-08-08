import { ReactNode } from "react";
import {
  AutomationPort,
  ClockHandlers,
  HostCallbacks,
  NoteInputPort,
  NoteOutputPort,
  Persistence,
  PortSubtype,
  UnitCallbacks,
  UnitInterface,
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
export type HsNoteInputPort = NoteInputPort;
export type HsAutomationInputPort = AutomationPort;
export type HsAdditionalAudioInputPort = HsAdditionalAudioPort;

type WrapperOutputPort<T> = T & {
  connectTo(port: T): void;
  disconnectTo(port: T): void;
};
export type HsNoteOutputPort = WrapperOutputPort<NoteOutputPort>;
export type HsAudioOutputPort = WrapperOutputPort<AudioPort>;
export type HsAutomationOutputPort = WrapperOutputPort<AutomationPort>;
export type HsAdditionalAudioOutputPort =
  WrapperOutputPort<HsAdditionalAudioPort>;

export type HsPortDirection = "input" | "output";
export type HsPortSubtype = PortSubtype;

export type HsPortInfoPrimary = {
  type: "primary";
  direction: HsPortDirection;
  subtypes: HsPortSubtype[];
  portId: string;
};
export type HsPortInfoPrimaryInner = {
  type: "primaryInner";
  direction: HsPortDirection;
  subtype: HsPortSubtype;
  portId: string;
};
export type HsPortInfoAdditional = {
  type: "additional";
  direction: HsPortDirection;
  subtype: HsPortSubtype;
  portId: string;
  label?: string;
};
export type HsPortInfo =
  | HsPortInfoPrimary
  | HsPortInfoPrimaryInner
  | HsPortInfoAdditional;

export type HsUnitInstance = {
  unitId: string;
  viewSize: [number, number];
  preferJustSize?: boolean;
  primaryInputPorts: {
    audioInput?: HsAudioInputPort;
    noteInput?: HsNoteInputPort;
    automationInput?: HsAutomationInputPort;
  };
  primaryOutputPorts: {
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
  portInfos: HsPortInfo[];
  cleanup?: () => void;
  RenderUi?: () => ReactNode;
};

/*
destSpec="unit1"        //self.primaryOutput --> unit1.primaryInput
destSpec="unit1.port1"  //self.primaryOutput --> unit1.port1
destSpec="unit1&unit2"  //self.primaryOutput --> unit1.primaryInput, unit2.primaryInput
destSpec="port1:unit2"  //self.port1 --> unit2.primaryInput
desSpec="unit1&unit2|port1:unit3.port2&unit4"
//self.primaryOutput --> unit1.primaryInput, unit2.primaryInput
//self.port1 --> unit3.port2, unit4.primaryInput
*/
export type DestinationCode = string;

export type HsUnitInterface = UnitInterface & {
  cancelLoading(): void;
  iframeUnloadingCallback?: () => void;
};

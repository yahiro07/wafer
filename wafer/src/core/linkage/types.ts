import { ReactNode } from "react";
import {
  AutomationPort,
  ClockHandlers,
  ClockOutputPort,
  HostCallbacks,
  NotePort,
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
export type HsNoteInputPort = NotePort;
export type HsAutomationInputPort = AutomationPort;
export type HsAdditionalAudioInputPort = HsAdditionalAudioPort;
export type HsClockInputPort = ClockHandlers;

type WrapperOutputPort<T> = T & {
  connectTo(port: T): void;
  disconnectTo(port: T): void;
};
type WrapperOutputPortEx<T, Q> = T & {
  connectTo(port: Q): void;
  disconnectTo(port: Q): void;
};
export type HsNoteOutputPort = WrapperOutputPort<NotePort>;
export type HsAudioOutputPort = WrapperOutputPort<AudioPort>;
export type HsAutomationOutputPort = WrapperOutputPort<AutomationPort>;
export type HsAdditionalAudioOutputPort =
  WrapperOutputPort<HsAdditionalAudioPort>;
export type HsClockOutputPort = WrapperOutputPortEx<
  ClockOutputPort,
  ClockHandlers
>;

export type HsPortDirection = "input" | "output";

export type HsPortInfo =
  | {
      isPrimary: false;
      direction: HsPortDirection;
      subtype: PortSubtype;
      portId: string;
      label?: string;
    }
  | {
      isPrimary: true;
      direction: HsPortDirection;
      subtypes: PortSubtype[];
      portId: string;
    };

export type HsUnitInstance = {
  unitId: string;
  viewSize?: [number, number];
  primaryInputPorts: {
    audioInput?: AudioPort;
    noteInput?: NotePort;
    automationInput?: AutomationPort;
  };
  primaryOutputPorts: {
    audioOutput?: HsAudioOutputPort;
    noteOutput?: HsNoteOutputPort;
    automationOutput?: HsAutomationOutputPort;
  };
  additionalAudioOutputs?: Record<string, HsAdditionalAudioOutputPort>;
  additionalAudioInputs?: Record<string, HsAdditionalAudioPort>;
  clockOutputPort?: HsClockOutputPort;
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
  iframeUnloadingCallback?: () => void;
};

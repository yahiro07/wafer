export type UnitType = "instrument" | "sequencer" | "effect";

export type UnitCategoryHint =
  | "synthesizer"
  | "stepSequencer"
  | "effect"
  | "visualizer"
  | "drumMachine"
  | "keyboard";

export type PortSubtype = "audio" | "note" | "automation";

export type NoteAttributes = {
  velocity?: number; //0~1
  [key: string]: any;
};

export type NoteOutputPort = {
  noteOn(noteNumber: number, time?: number, attrs?: NoteAttributes): void;
  noteOff(noteNumber: number, time?: number): void;
};

export type NoteInputPort = NoteOutputPort;

export type AutomationParameterSpec = {
  id: string;
  label?: string;
  steps?: number; //2 for on/off, 3 for low/medium/high, etc
  //all parameters are ranged in 0~1
};

export type AutomationValueOptions = {
  time?: number;
  duration?: number;
};

export type AutomationInputPort = {
  getParameterSpecs(): AutomationParameterSpec[];
  getParameter(id: string): number | undefined;
  setParameter(
    id: string,
    value: number,
    options?: AutomationValueOptions,
  ): void;
};

export type AutomationOutputPort = {
  emitValue(value: number, options?: AutomationValueOptions): void;
};

export type Persistence = {
  emitState?(): Record<string, any>;
  applyState?(state: Record<string, any>): void;
  emitStateBytes?(): Uint8Array;
  applyStateBytes?(bytes: Uint8Array): void;
};

export type ClockHandlers = {
  start?(): void;
  stop?(): void;
  processScheduling?(
    timeFrom: number, //absolute time based on AudioContext.currentTime
    barFrom: number, //decimal bar position in song
    barTo: number, //decimal bar position in song
    bpm: number,
  ): void;
  processStep?(
    stepIndex: number, //16th note based step from song start, not wrapped
    time: number, //audio context time for actual step position
    unitDuration: number, //length of 16th note in seconds
  ): void;
};

export type UnitAspects = {
  unitType: UnitType;
  categoryHint?: UnitCategoryHint;
  viewSize?: [number, number];
  preferJustSize?: boolean;
};

export type MetaAttributes = Record<string, any>;

export type SongKeySpec = {
  mode: "major" | "minor";
  root: number; //-12~12, 0 for C/Cm, 1 for C#/C#m, 2 for D/Dm, -1 for B/Bm, ...etc
  relativeKeyTranspose: number; //-12~12, 0 for C/Am, 1 for C#/A#m, 2 for D/Bm, -1 for B/G#m, ...etc
};

export type HostCallbacks = {
  setBpm?(bpm: number): void;
  setPlayState?(playing: boolean): void;
  setMetaAttributes?(metaAttrs: MetaAttributes): void;
  setKey?(keySpec: SongKeySpec): void;
};

export type UnitCallbacks = {
  //deprecated
  // onConnectedTo?(srcPortId: string, linkedPortSubtypes: PortSubtype[]): void;
  // onDisconnectedTo?(srcPortId: string): void;
  onMessageFromHost?(message: object): any;
  setViewActive?(viewActive: boolean): void;
};

export type PresetProvider = {
  getPresetNames?(): string[];
  applyPreset?(presetName: string): void;
  getCommandNames?(): string[];
  applyCommand?(commandName: string): void | boolean; //if true returned, host ui resets the preset selection
};

export type ViewSizeSetterPayload = {
  width: number;
  height: number;
  preferJustSize?: boolean;
};

export type UnitInterface = {
  audioContext: AudioContext;
  audioOutputNode: AudioNode;
  audioInputNode: AudioNode;
  createNoteOutputPort(): NoteOutputPort;
  createAutomationOutputPort(id?: string, label?: string): AutomationOutputPort;
  createAdditionalAudioOutputNode(id: string, label?: string): AudioNode;
  createAdditionalAudioInputNode(id: string, label?: string): AudioNode;
  sendMessageToHost(message: object): any;
  emitMetaAttributes(metaAttrs: MetaAttributes): void;
  setViewSize(payload: ViewSizeSetterPayload): void;
  completeSetup(attrs: {
    unitAspects: UnitAspects;
    hostCallbacks?: HostCallbacks;
    noteInput?: NoteInputPort;
    persistence?: Persistence;
    clockHandlers?: ClockHandlers;
    automationInput?: AutomationInputPort;
    unitCallbacks?: UnitCallbacks;
    presetProvider?: PresetProvider;
    cleanup?: () => void;
  }): void;
};

export type UnitInterfaceProvider = {
  //for iframe based units
  queryUnitInterface?(versionCode: string): UnitInterface | undefined;
  iframeUnitUnloadingCallback?: () => void;
  //for web component units
  queryUnitInterfaceForModule?(
    versionCode: string,
    importMetaUrl: string,
  ): UnitInterface | undefined;
};

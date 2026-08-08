export type UnitType = "instrument" | "sequencer" | "effect";

export type UnitCategoryHint =
  | "synthesizer"
  | "stepSequencer"
  | "effect"
  | "visualizer"
  | "drumMachine"
  | "keyboard";

export type PortSubtype = "audio" | "note" | "automation";

export type NoteOutputPort = {
  noteOn(noteNumber: number, time?: number, velocity?: number): void; //velocity:0~1
  noteOff(noteNumber: number, time?: number): void;
};

export type NoteInputPort = NoteOutputPort;

export type AutomationParameterSpec = {
  id: string;
  steps?: number; //2 for on/off, 3 for low/medium/high, etc
  //all parameters are ranged in 0~1
};

export type AutomationPort = {
  getParameterSpecs(): AutomationParameterSpec[];
  getParameter(id: string): number | undefined;
  setParameter(id: string, value: number, time?: number): void;
};

export type Persistence = {
  subscribeChange?(fn: () => void): () => void;
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
  viewSize: [number, number];
  preferJustSize?: boolean;
};

export type MetaAttributes = Record<string, any>;

export type SongKeySpec = {
  mode: "major" | "minor";
  root: number; //0 for C/Cm, 1 for C#/C#m, 2 for D/Dm, -1 for B/Bm, ...etc
  keyTranspose: number; //0 for C/Am, 1 for C#/A#m, 2 for D/Bm, -1 for B/G#m, ...etc
};

export type HostCallbacks = {
  setBpm?(bpm: number): void;
  setPlayState?(playing: boolean): void;
  setMetaAttributes?(metaAttrs: MetaAttributes): void;
  setKey?(keySpec: SongKeySpec): void;
};

export type UnitCallbacks = {
  onConnectedTo?(srcPortId: string, linkedPortSubtypes: PortSubtype[]): void;
  onDisconnectedTo?(srcPortId: string): void;
  // onMessageFromSourceUnit?(message: object): void;
};

export type UnitInterface = {
  audioContext: AudioContext;
  audioOutputNode: AudioNode;
  audioInputNode: AudioNode;
  createNoteOutputPort(): NoteOutputPort;
  createAutomationOutputPort(): AutomationPort;
  createAdditionalAudioOutputNode(id: string, label?: string): AudioNode;
  createAdditionalAudioInputNode(id: string, label?: string): AudioNode;
  sendMessageToHost(message: object): void;
  emitMetaAttributes(metaAttrs: MetaAttributes): void;
  // sendMessageToDestinationUnits(message: object): void;
  completeSetup(attrs: {
    unitAspects: UnitAspects;
    hostCallbacks?: HostCallbacks;
    noteInput?: NoteInputPort;
    persistence?: Persistence;
    clockHandlers?: ClockHandlers;
    automationInput?: AutomationPort;
    unitCallbacks?: UnitCallbacks;
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

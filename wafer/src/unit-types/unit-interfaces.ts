export type UnitType = "instrument" | "sequencer" | "effect";

export type UnitCategoryHint =
  | "synthesizer"
  | "stepSequencer"
  | "effect"
  | "visualizer"
  | "drumMachine"
  | "keyboard";

export type PortSubtype = "audio" | "note" | "automation";

export type NotePort = {
  noteOn(noteNumber: number, time?: number, velocity?: number): void; //velocity:0~1
  noteOff(noteNumber: number, time?: number): void;
};

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
  outputs?: PortSubtype[];
  inputs?: PortSubtype[];
};

export type MetaAttributes = Record<string, any>;

export type HostCallbacks = {
  setBpm?(bpm: number): void;
  setPlayState?(playing: boolean): void;
  setMetaAttributes?(metaAttrs: MetaAttributes): void;
};

export type UnitCallbacks = {
  onConnectedTo?(linkedPortSubtypes: PortSubtype[]): void;
  onDisconnectedTo?(): void;
};

export type UnitInterface = {
  audioContext: AudioContext;
  audioOutputNode: AudioNode;
  audioInputNode: AudioNode;
  noteOutputPort: NotePort;
  automationOutputPort: AutomationPort;
  emitMetaAttributes(metaAttrs: MetaAttributes): void;
  completeSetup(attrs: {
    unitAspects: UnitAspects;
    hostCallbacks?: HostCallbacks;
    noteInput?: NotePort;
    persistence?: Persistence;
    clockHandlers?: ClockHandlers;
    automationInput?: AutomationPort;
    unitCallbacks?: UnitCallbacks;
  }): void;
};

export type UnitInterfaceProvider = {
  //for iframe based units, legacy js
  checkUnitInterfaceCompatibility?(versionCode: string): void;
  unitInterface?: UnitInterface;
  //for iframe based units, typescript
  queryUnitInterface?(versionCode: string): UnitInterface | undefined;
  //for web component units
  queryUnitInterfaceForModule?(
    versionCode: string,
    importMetaUrl: string,
  ): UnitInterface | undefined;
};

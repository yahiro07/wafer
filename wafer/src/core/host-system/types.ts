export type IAudioContext = AudioContext | OfflineAudioContext;

export type UnitNoteOutputMonitorFn = (args: {
  sourceUnitId: string;
  noteNumber: number;
  isOn: boolean;
  time?: number;
  velocity?: number;
}) => void;

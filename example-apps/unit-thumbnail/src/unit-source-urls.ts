export const unitSourceUrls = [
  "https://github.com/yahiro07/wafer-units/tree/r22/graphite-drum-machine/",
  "https://github.com/yahiro07/wafer-units/tree/r22/mini-synth-ge/",
  "https://github.com/yahiro07/wafer-units/tree/r22/bseq2/",
  "https://github.com/yahiro07/wafer-units/tree/r22/tonerio-sequencer/",
  "https://github.com/yahiro07/wafer-units/tree/r22/fluorite-piano-roll/",
  "https://github.com/yahiro07/wafer-custom-units/tree/r19/webaudio-tinysynth-mini/",
  "https://github.com/yahiro07/wafer-custom-units/tree/r19/super-oscillator/",
  "https://github.com/yahiro07/wafer-custom-units/tree/r19/vue-audio-mixer/",
  //add "file://path/to/your/local/unit/to/capture/thumbnail/"
];

if (0) {
  const toAbsolute = (path: string) => new URL(path, import.meta.url).pathname;
  const localWaferUnitsBase = toAbsolute("../../../../wafer-units/");
  unitSourceUrls.push(`file://${localWaferUnitsBase}/dist/orion/`);
}

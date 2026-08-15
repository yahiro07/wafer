export const unitSourceUrls = [
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r18/graphite-drum-machine/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r18/mini-synth-ge/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r18/bseq2/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r18/tonerio-sequencer/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r18/fluorite-piano-roll/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-custom-units@r18/webaudio-tinysynth-mini/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-custom-units@r18/super-oscillator/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-custom-units@r18/vue-audio-mixer/",
  //add "file://path/to/your/local/unit/to/capture/thumbnail/"
];

if (0) {
  const toAbsolute = (path: string) => new URL(path, import.meta.url).pathname;
  const localWaferUnitsBase = toAbsolute("../../../../wafer-units/");
  unitSourceUrls.push(`file://${localWaferUnitsBase}/dist/orion/`);
}

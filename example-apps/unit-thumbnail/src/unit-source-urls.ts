export const unitSourceUrls = [
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r21/graphite-drum-machine/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r21/mini-synth-ge/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r21/bseq2/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r21/tonerio-sequencer/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-units@r21/fluorite-piano-roll/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-custom-units@r19/webaudio-tinysynth-mini/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-custom-units@r19/super-oscillator/",
  "https://cdn.jsdelivr.net/gh/yahiro07/wafer-custom-units@r19/vue-audio-mixer/",
  //add "file://path/to/your/local/unit/to/capture/thumbnail/"
];

if (0) {
  const toAbsolute = (path: string) => new URL(path, import.meta.url).pathname;
  const localWaferUnitsBase = toAbsolute("../../../../wafer-units/");
  unitSourceUrls.push(`file://${localWaferUnitsBase}/dist/orion/`);
}

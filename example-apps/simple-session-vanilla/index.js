import { createHostSystem, createSequencerTickDriver } from "https://esm.sh/wafer-host/core";
import { registerCustomElements } from "./lib.js";

const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext);
const sequencerTickDriver = createSequencerTickDriver(hostSystem);

registerCustomElements(hostSystem);

const store = {
  playing: false,
  bpm: 100,
};

function setupUnit(baseDiv, unitId, destSpec, url) {
  baseDiv.innerHTML = `
    <unit-frame-scaled unit-id="${unitId}" dest-spec="${destSpec}" url="${url}"></unit-frame-scaled>
  `;
}

function setupPlayButton(button) {
  button.addEventListener("click", () => {
    store.playing = !store.playing;
    if (store.playing) {
      sequencerTickDriver.setBpm(store.bpm);
      sequencerTickDriver.start();
    } else {
      sequencerTickDriver.stop();
    }
    button.classList.toggle("--active", store.playing);
  });
}

function setupBpmInput(bpmInput, bpmText) {
  bpmInput.addEventListener("input", (e) => {
    store.bpm = e.target.value;
    bpmText.textContent = store.bpm;
    sequencerTickDriver.setBpm(store.bpm);
  });
}

window.addEventListener("load", () => {
  const getElement = (id) => document.getElementById(id);
  const doms = {
    card1: getElement("unit-card-1"),
    card2: getElement("unit-card-2"),
    card3: getElement("unit-card-3"),
    card4: getElement("unit-card-4"),
    playButton: getElement("play-button"),
    bpmInput: getElement("bpm-input"),
    bpmText: getElement("bpm-text"),
  };
  setupUnit(doms.card1, "effect1", "$output", "units/sunset-delay/index.js");
  setupUnit(doms.card2, "synth1", "effect1", "units/webaudio-tinysynth-mini/index.html");
  setupUnit(doms.card3, "drum1", "$output", "units/graphite-drum-machine/index.js");
  setupUnit(doms.card4, "sequencer1", "synth1", "units/tonerio-sequencer/index.html");
  setupPlayButton(doms.playButton);
  setupBpmInput(doms.bpmInput, doms.bpmText);
});

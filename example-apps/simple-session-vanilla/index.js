import {
  createHostSystem,
  createSequencerTickDriver,
} from "https://esm.sh/wafer-host@0.1.19/core";
import { registerCustomElements } from "https://esm.sh/wafer-host@0.1.19/custom-elements";

const hostSystem = createHostSystem();
registerCustomElements(hostSystem);
const sequencerTickDriver = createSequencerTickDriver(hostSystem);

const store = {
  playing: false,
  bpm: 100,
};

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

function randomizeSequencerPattern() {
  const sequencerFrame = document.querySelector(
    'unit-frame-scaled[unit-id="sequencer1"]',
  );
  sequencerFrame.onUnitInstanceLoaded = (unit) => {
    if (unit.presetProvider?.getCommandNames?.().includes("random")) {
      unit.presetProvider.applyCommand("random");
    }
  };
}
randomizeSequencerPattern();

window.addEventListener("load", () => {
  const getElement = (id) => document.getElementById(id);
  const doms = {
    playButton: getElement("play-button"),
    bpmInput: getElement("bpm-input"),
    bpmText: getElement("bpm-text"),
  };
  setupPlayButton(doms.playButton);
  setupBpmInput(doms.bpmInput, doms.bpmText);
});

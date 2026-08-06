import { createHostSystem, createSequencerTickDriver } from "https://esm.sh/wafer-host/core";
const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext);
const sequencerTickDriver = createSequencerTickDriver(hostSystem);

const store = {
  playing: false,
  bpm: 100,
};

const createElement = (tag) => document.createElement(tag);
const getElement = (id) => document.getElementById(id);

function createUnit(baseDiv, unitId, destSpec, url) {
  const innerDiv = createElement("div");
  baseDiv.appendChild(innerDiv);
  baseDiv.style.overflow = "hidden";

  const iframe = createElement("iframe");
  iframe.src = url;
  innerDiv.appendChild(iframe);

  const win = iframe.contentWindow;
  const unitInterface = hostSystem.linkageApi.createUnitInterface(unitId, (unitInstance) => {
    const baseRect = baseDiv.getBoundingClientRect();
    const [w, h] = unitInstance.viewSize;
    const scale = Math.min(baseRect.width / w, baseRect.height / h);

    baseDiv.style.display = "flex";
    baseDiv.style.justifyContent = "center";
    baseDiv.style.alignItems = "center";

    iframe.style.width = w + "px";
    iframe.style.height = h + "px";
    iframe.style.border = "none";

    innerDiv.style.transform = `scale(${scale})`;
    innerDiv.style.transformOrigin = "center";
    hostSystem.linkageApi.registerUnitInstance(unitInstance);
    hostSystem.linkageApi.reserveConnection(`${unitId}.primaryOutput`, destSpec, true);
  });
  win.queryUnitInterface = (versionCode) => {
    if (versionCode === "wafer-v01") {
      return unitInterface;
    }
  };
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
  const doms = {
    card1: getElement("unit-card-1"),
    card2: getElement("unit-card-2"),
    card3: getElement("unit-card-3"),
    card4: getElement("unit-card-4"),
    playButton: getElement("play-button"),
    bpmInput: getElement("bpm-input"),
    bpmText: getElement("bpm-text"),
  };
  createUnit(doms.card1, "effect1", "$output", "./units/lofi2/index.html");
  createUnit(doms.card2, "synth1", "effect1", "./units/webaudio-tinysynth-mini/index.html");
  createUnit(doms.card3, "drum1", "effect1", "./units/techno-beat-machine/index.html");
  createUnit(doms.card4, "sequencer1", "synth1", "./units/bseq2/index.html");
  setupPlayButton(doms.playButton);
  setupBpmInput(doms.bpmInput, doms.bpmText);
});

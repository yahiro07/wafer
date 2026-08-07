import { createHostSystem, createSequencerTickDriver } from "https://esm.sh/wafer-host/core";

//library prototyping

// function setupIframeUnit(baseDiv, unitId, destSpec, url) {
//   const innerDiv = createElement("div");
//   baseDiv.appendChild(innerDiv);

//   const iframe = createElement("iframe");
//   iframe.src = url;
//   innerDiv.appendChild(iframe);

//   const win = iframe.contentWindow;
//   const unitInterface = hostSystem.linkageApi.createUnitInterface(unitId, (unitInstance) => {
//     const baseRect = baseDiv.getBoundingClientRect();
//     const [w, h] = unitInstance.viewSize;
//     const scale = Math.min(baseRect.width / w, baseRect.height / h);
//     innerDiv.style.transform = `scale(${scale})`;
//     innerDiv.style.transformOrigin = "center";
//     iframe.style.width = w + "px";
//     iframe.style.height = h + "px";
//     iframe.style.border = "none";
//     hostSystem.linkageApi.registerUnitInstance(unitInstance);
//     hostSystem.linkageApi.reserveConnection(`${unitId}.primaryOutput`, destSpec, true);
//   });
//   win.queryUnitInterface = (versionCode) => {
//     if (versionCode === "wafer-v01") {
//       return unitInterface;
//     }
//   };
// }

function registerCustomElements(hostSystem) {
  class UnitFrameScaled extends HTMLElement {
    static get observedAttributes() {
      return ["unit-id", "dest-spec", "url"];
    }

    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      this.shadowRoot.innerHTML = `
        <style>
        :host{
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          overflow: hidden;
        }
        #inner{
          transform-origin: center;
        }
        #iframe{
          border:none;
          display: block;
        }
        </style>
        <div id="inner"></div>
      `;
      this._cleanup = null;
    }

    connectedCallback() {
      this.#mount();
    }
    disconnectedCallback() {
      this._cleanup?.();
      this._cleanup = null;
    }

    #mount() {
      const unitId = this.getAttribute("unit-id");
      const destSpec = this.getAttribute("dest-spec");
      const url = this.getAttribute("url");
      const baseRect = this.getBoundingClientRect();
      const innerDiv = this.shadowRoot.querySelector("#inner");

      const unitInterface = hostSystem.linkageApi.createUnitInterface(unitId, (unitInstance) => {
        // console.log("unit loaded");
        // console.log({ baseRect });
        const [w, h] = unitInstance.viewSize;
        const scale = Math.min(baseRect.width / w, baseRect.height / h);
        innerDiv.style.transform = `scale(${scale})`;
        iframe.style.width = w + "px";
        iframe.style.height = h + "px";
        hostSystem.linkageApi.registerUnitInstance(unitInstance);
        hostSystem.linkageApi.reserveConnection(`${unitId}.primaryOutput`, destSpec, true);
      });

      const iframe = createElement("iframe");
      iframe.id = "iframe";
      iframe.src = url;
      innerDiv.appendChild(iframe);
      const win = iframe.contentWindow;
      win.queryUnitInterface = (versionCode) => {
        if (versionCode === "wafer-v01") {
          return unitInterface;
        }
      };
    }
  }
  customElements.define("unit-frame-scaled", UnitFrameScaled);
}

//

const audioContext = new AudioContext();
const hostSystem = createHostSystem(audioContext);
const sequencerTickDriver = createSequencerTickDriver(hostSystem);

registerCustomElements(hostSystem);

const store = {
  playing: false,
  bpm: 100,
};

const createElement = (tag) => document.createElement(tag);
const getElement = (id) => document.getElementById(id);

// const customElementUnitInterfaceMap = new Map();
// window.queryUnitInterfaceForModule = (versionCode, requestModuleUrl) => {
//   if (versionCode === "wafer-v01") {
//     const item = customElementUnitInterfaceMap.get(requestModuleUrl);
//     customElementUnitInterfaceMap.delete(requestModuleUrl);
//     return item;
//   }
//   return undefined;
// };

// async function setupWebComponentsUnit(baseDiv, unitId, destSpec, url) {
//   const innerDiv = createElement("div");
//   baseDiv.appendChild(innerDiv);
//   const subInnerDiv = createElement("div");
//   innerDiv.appendChild(subInnerDiv);

//   const unitInterface = hostSystem.linkageApi.createUnitInterface(unitId, (unitInstance) => {
//     const baseRect = baseDiv.getBoundingClientRect();
//     const [w, h] = unitInstance.viewSize;
//     const scale = Math.min(baseRect.width / w, baseRect.height / h);
//     innerDiv.style.transform = `scale(${scale})`;
//     innerDiv.style.transformOrigin = "center";
//     subInnerDiv.style.width = w + "px";
//     subInnerDiv.style.height = h + "px";
//     hostSystem.linkageApi.registerUnitInstance(unitInstance);
//     hostSystem.linkageApi.reserveConnection(`${unitId}.primaryOutput`, destSpec, true);
//   });
//   const moduleUrl = `${location.origin}/${url}?tagName=${unitId}`;
//   customElementUnitInterfaceMap.set(moduleUrl, unitInterface);

//   const tagName = `${unitId}-unit`;
//   const unitElementClass = await import(moduleUrl).then((module) => module.default);
//   if (unitElementClass.supportsSharableUnitClass) {
//     throw new Error(`Sharable unit class is not supported: ${moduleUrl}`);
//   }
//   customElements.define(tagName, unitElementClass);
//   const element = createElement(tagName);
//   subInnerDiv.appendChild(element);
// }

function setupUnit(baseDiv, unitId, destSpec, url) {
  if (url.endsWith(".js")) {
    // setupWebComponentsUnit(baseDiv, unitId, destSpec, url);
  } else {
    // setupIframeUnit(baseDiv, unitId, destSpec, url);
    const rr = baseDiv.getBoundingClientRect();
    console.log({ rr });
    baseDiv.innerHTML = `
    <unit-frame-scaled unit-id="${unitId}" dest-spec="${destSpec}" url="${url}"></unit-frame-scaled>
  `;
  }
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
  setupUnit(doms.card1, "effect1", "$output", "units/sunset-delay/index.js");
  setupUnit(doms.card2, "synth1", "effect1", "units/webaudio-tinysynth-mini/index.html");
  setupUnit(doms.card3, "drum1", "$output", "units/graphite-drum-machine/index.js");
  setupUnit(doms.card4, "sequencer1", "synth1", "units/tonerio-sequencer/index.html");
  setupPlayButton(doms.playButton);
  setupBpmInput(doms.bpmInput, doms.bpmText);
});

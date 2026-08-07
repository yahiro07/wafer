function setupIframeUnit(hostSystem, outerElement, unitId, destSpec, url, loadedCallback) {
  let cleanupFn = null;

  const unitInterface = hostSystem.linkageApi.createUnitInterface(unitId, (unitInstance) => {
    const [w, h] = unitInstance.viewSize;
    iframe.style.width = w + "px";
    iframe.style.height = h + "px";
    cleanupFn = hostSystem.linkageApi.registerUnitInstance(unitInstance);
    hostSystem.linkageApi.reserveConnection(`${unitId}.primaryOutput`, destSpec, true);
    loadedCallback?.(unitInstance);
  });

  const iframe = document.createElement("iframe");
  iframe.style.border = "none";
  iframe.src = url;
  outerElement.appendChild(iframe);
  const win = iframe.contentWindow;
  win.queryUnitInterface = (versionCode) => {
    if (versionCode === "wafer-v01") {
      return unitInterface;
    }
  };

  return () => {
    cleanupFn?.();
    cleanupFn = null;
  };
}

const customElementUnitInterfaceMap = new Map();
window.queryUnitInterfaceForModule = (versionCode, requestModuleUrl) => {
  if (versionCode === "wafer-v01") {
    const item = customElementUnitInterfaceMap.get(requestModuleUrl);
    customElementUnitInterfaceMap.delete(requestModuleUrl);
    return item;
  }
  return undefined;
};

async function setupWebComponentsUnit(
  hostSystem,
  outerElement,
  unitId,
  destSpec,
  url,
  loadedCallback,
) {
  let cleanupFn = null;
  let viewSize = null;

  const unitInterface = hostSystem.linkageApi.createUnitInterface(unitId, (unitInstance) => {
    viewSize = unitInstance.viewSize;
    cleanupFn = hostSystem.linkageApi.registerUnitInstance(unitInstance);
    hostSystem.linkageApi.reserveConnection(`${unitId}.primaryOutput`, destSpec, true);
    loadedCallback?.(unitInstance);
  });
  const moduleUrl = `${location.origin}/${url}?tagName=${unitId}`;
  customElementUnitInterfaceMap.set(moduleUrl, unitInterface);

  const tagName = `${unitId}-unit`;
  const unitElementClass = await import(moduleUrl).then((module) => module.default);
  if (unitElementClass.supportsSharableUnitClass) {
    throw new Error(`Sharable unit class is not supported: ${moduleUrl}`);
  }
  customElements.define(tagName, unitElementClass);

  const unitElement = document.createElement(tagName);
  if (viewSize) {
    const [w, h] = viewSize;
    unitElement.style.width = w + "px";
    unitElement.style.height = h + "px";
  }
  outerElement.appendChild(unitElement);

  return () => {
    cleanupFn?.();
    cleanupFn = null;
  };
}

export function registerCustomElements(hostSystem) {
  class UnitFrame extends HTMLElement {
    static get observedAttributes() {
      return ["unit-id", "dest-spec", "url"];
    }
    onUnitInstanceLoaded = null;

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
      this.attachShadow({ mode: "open" });
      if (url.endsWith(".js")) {
        this._cleanup = setupWebComponentsUnit(
          hostSystem,
          this.shadowRoot,
          unitId,
          destSpec,
          url,
          (unitInstance) => {
            this.onUnitInstanceLoaded?.(unitInstance);
          },
        );
      } else {
        this._cleanup = setupIframeUnit(
          hostSystem,
          this.shadowRoot,
          unitId,
          destSpec,
          url,
          (unitInstance) => {
            this.onUnitInstanceLoaded?.(unitInstance);
          },
        );
      }
    }
  }
  customElements.define("unit-frame", UnitFrame);

  class UnitFrameScaled extends HTMLElement {
    static get observedAttributes() {
      return ["unit-id", "dest-spec", "url"];
    }

    onUnitInstanceLoaded = null;

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
        #scaler{
          transform-origin: center;
        }
        </style>
        <div id="scaler">
          <unit-frame id="unit-frame" unit-id="${unitId}" dest-spec="${destSpec}" url="${url}"></unit-frame>
        </div>
      `;

      const unitFrame = this.shadowRoot.querySelector("#unit-frame");
      const scalerDiv = this.shadowRoot.querySelector("#scaler");

      unitFrame.onUnitInstanceLoaded = (unitInstance) => {
        const baseRect = this.getBoundingClientRect();
        const [w, h] = unitInstance.viewSize;
        const scale = Math.min(baseRect.width / w, baseRect.height / h);
        scalerDiv.style.transform = `scale(${scale})`;
        this.onUnitInstanceLoaded?.(unitInstance);
      };
    }
  }
  customElements.define("unit-frame-scaled", UnitFrameScaled);
}

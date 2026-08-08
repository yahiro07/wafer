import { HostSystem, HsUnitInstance } from "../core";
import { UnitInterface, UnitInterfaceProvider } from "../unit-types";

type LoadedCallback = (unitInstance: HsUnitInstance) => void;
type CleanupFn = () => void;

type UnitElementClass = CustomElementConstructor & {
  supportsSharableUnitClass?: boolean;
};

function setupIframeUnit(
  hostSystem: HostSystem,
  outerElement: ShadowRoot,
  unitId: string,
  destSpec: string,
  url: string,
  loadedCallback?: LoadedCallback,
): CleanupFn {
  let cleanupFn: CleanupFn | null = null;

  const unitInterface = hostSystem.linkageApi.createUnitInterface(
    unitId,
    (unitInstance) => {
      const [w, h] = unitInstance.viewSize;
      iframe.style.width = w + "px";
      iframe.style.height = h + "px";
      cleanupFn = hostSystem.linkageApi.registerUnitInstance(unitInstance);
      hostSystem.linkageApi.reserveConnection(
        `${unitId}.primaryOutput`,
        destSpec,
        true,
      );
      loadedCallback?.(unitInstance);
    },
  );

  const iframe = document.createElement("iframe");
  iframe.style.border = "none";
  iframe.src = url;
  outerElement.appendChild(iframe);
  const win = iframe.contentWindow as unknown as UnitInterfaceProvider;
  win.queryUnitInterface = (versionCode: string) => {
    if (versionCode === "wafer-v01") {
      return unitInterface;
    }
  };

  return () => {
    cleanupFn?.();
    cleanupFn = null;
  };
}

const customElementUnitInterfaceMap = new Map<string, UnitInterface>();
(window as UnitInterfaceProvider).queryUnitInterfaceForModule = (
  versionCode: string,
  requestModuleUrl: string,
) => {
  if (versionCode === "wafer-v01") {
    const item = customElementUnitInterfaceMap.get(requestModuleUrl);
    customElementUnitInterfaceMap.delete(requestModuleUrl);
    return item;
  }
  return undefined;
};

async function setupWebComponentsUnit(
  hostSystem: HostSystem,
  outerElement: ShadowRoot,
  unitId: string,
  destSpec: string,
  url: string,
  loadedCallback?: LoadedCallback,
): Promise<CleanupFn> {
  let cleanupFn: CleanupFn | null = null;
  const state: { viewSize: [number, number] | null } = { viewSize: null };

  const unitInterface = hostSystem.linkageApi.createUnitInterface(
    unitId,
    (unitInstance) => {
      state.viewSize = unitInstance.viewSize;
      cleanupFn = hostSystem.linkageApi.registerUnitInstance(unitInstance);
      hostSystem.linkageApi.reserveConnection(
        `${unitId}.primaryOutput`,
        destSpec,
        true,
      );
      loadedCallback?.(unitInstance);
    },
  );
  const moduleUrl = `${location.origin}/${url}?tagName=${unitId}`;
  customElementUnitInterfaceMap.set(moduleUrl, unitInterface);

  const tagName = `${unitId}-unit`;
  const unitElementClass = await import(moduleUrl).then(
    (module: { default: UnitElementClass }) => module.default,
  );
  if (unitElementClass.supportsSharableUnitClass) {
    throw new Error(`Sharable unit class is not supported: ${moduleUrl}`);
  }
  customElements.define(tagName, unitElementClass);

  const unitElement = document.createElement(tagName);
  if (state.viewSize) {
    const [w, h] = state.viewSize;
    unitElement.style.width = w + "px";
    unitElement.style.height = h + "px";
  }
  outerElement.appendChild(unitElement);

  return () => {
    cleanupFn?.();
    cleanupFn = null;
  };
}

export function registerCustomElements(hostSystem: HostSystem): void {
  class UnitFrame extends HTMLElement {
    static get observedAttributes(): string[] {
      return ["unit-id", "dest-spec", "url"];
    }
    onUnitInstanceLoaded: LoadedCallback | null = null;
    _cleanup: CleanupFn | null = null;

    connectedCallback(): void {
      this.#mount();
    }
    disconnectedCallback(): void {
      this._cleanup?.();
      this._cleanup = null;
    }

    #mount(): void {
      const unitId = this.getAttribute("unit-id");
      const destSpec = this.getAttribute("dest-spec");
      const url = this.getAttribute("url");
      if (!unitId || !destSpec || !url) {
        throw new Error(
          "unit-frame requires unit-id, dest-spec, and url attributes",
        );
      }
      this.attachShadow({ mode: "open" });
      const shadowRoot = this.shadowRoot!;
      if (url.endsWith(".js")) {
        void setupWebComponentsUnit(
          hostSystem,
          shadowRoot,
          unitId,
          destSpec,
          url,
          (unitInstance) => {
            this.onUnitInstanceLoaded?.(unitInstance);
          },
        ).then((cleanup) => {
          this._cleanup = cleanup;
        });
      } else {
        this._cleanup = setupIframeUnit(
          hostSystem,
          shadowRoot,
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
    static get observedAttributes(): string[] {
      return ["unit-id", "dest-spec", "url"];
    }

    onUnitInstanceLoaded: LoadedCallback | null = null;
    _cleanup: CleanupFn | null = null;

    connectedCallback(): void {
      this.#mount();
    }
    disconnectedCallback(): void {
      this._cleanup?.();
      this._cleanup = null;
    }

    #mount(): void {
      const unitId = this.getAttribute("unit-id");
      const destSpec = this.getAttribute("dest-spec");
      const url = this.getAttribute("url");
      if (!unitId || !destSpec || !url) {
        throw new Error(
          "unit-frame-scaled requires unit-id, dest-spec, and url attributes",
        );
      }

      this.attachShadow({ mode: "open" });
      const shadowRoot = this.shadowRoot!;
      shadowRoot.innerHTML = `
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

      const unitFrame = shadowRoot.querySelector(
        "#unit-frame",
      ) as UnitFrame | null;
      const scalerDiv = shadowRoot.querySelector("#scaler") as HTMLDivElement | null;
      if (!unitFrame || !scalerDiv) {
        throw new Error("unit-frame-scaled failed to mount internal elements");
      }

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

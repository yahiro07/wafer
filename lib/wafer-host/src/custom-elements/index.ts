import { HostSystem, HsUnitInstance } from "../core";
import { HsViewSize } from "../core/linkage/types";
import {
  makeSize,
  observeElementSize,
  Size,
} from "../mounter-common/size-helper";
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
  Object.assign(iframe.style, {
    width: "100%",
    height: "100%",
    border: "none",
  });
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

  const unitInterface = hostSystem.linkageApi.createUnitInterface(
    unitId,
    (unitInstance) => {
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
  const unitElementClass = await import(/* @vite-ignore */ moduleUrl).then(
    (module: { default: UnitElementClass }) => module.default,
  );
  if (unitElementClass.supportsSharableUnitClass) {
    throw new Error(`Sharable unit class is not supported: ${moduleUrl}`);
  }
  customElements.define(tagName, unitElementClass);

  const unitElement = document.createElement(tagName);
  outerElement.appendChild(unitElement);

  return () => {
    cleanupFn?.();
    cleanupFn = null;
  };
}

const moduleLocal = {
  hostSystem: undefined! as HostSystem,
};

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
    Object.assign(this.style, { width: "100%", height: "100%" });
    const shadowRoot = this.shadowRoot!;
    if (url.endsWith(".js")) {
      void setupWebComponentsUnit(
        moduleLocal.hostSystem,
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
        moduleLocal.hostSystem!,
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

class UnitFrameScaled extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["unit-id", "dest-spec", "url"];
  }

  onUnitInstanceLoaded: LoadedCallback | null = null;

  private cleanupFns: CleanupFn[] | null = null;

  connectedCallback(): void {
    this.mount();
  }
  disconnectedCallback(): void {
    this.cleanupFns?.forEach((cleanup) => cleanup());
    this.cleanupFns = null;
  }

  private mount(): void {
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
        display: flex;
        justify-content: center;
        align-items: center;
      }
      </style>
      <div id="scaler">
        <unit-frame id="unit-frame" unit-id="${unitId}" dest-spec="${destSpec}" url="${url}"></unit-frame>
      </div>
    `;

    const unitFrame = shadowRoot.querySelector(
      "#unit-frame",
    ) as UnitFrame | null;
    const scalerDiv = shadowRoot.querySelector(
      "#scaler",
    ) as HTMLDivElement | null;
    if (!unitFrame || !scalerDiv) {
      throw new Error("unit-frame-scaled failed to mount internal elements");
    }

    const state: {
      outerSize: Size | null;
      unitViewSize: HsViewSize | null;
    } = {
      outerSize: null,
      unitViewSize: null,
    };

    const self = this;
    const internal = {
      addCleanupFn(fn: CleanupFn): void {
        self.cleanupFns ??= [];
        self.cleanupFns.push(fn);
      },
      updateScaling() {
        const { outerSize, unitViewSize } = state;
        const innerSize = unitViewSize;
        const scale =
          outerSize && innerSize
            ? Math.min(
                outerSize.width / innerSize.width,
                outerSize.height / innerSize.height,
              )
            : 1;
        scalerDiv.style.transform = `scale(${scale})`;
        if (unitViewSize) {
          const { width, height, preferJustSize } = unitViewSize;
          if (preferJustSize) {
            scalerDiv.style.width = width + "px";
            scalerDiv.style.height = height + "px";
          } else {
            scalerDiv.style.width = `${100 / scale}%`;
            scalerDiv.style.height = `${100 / scale}%`;
          }
        }
      },
      setupObserveOuterSize() {
        const outerDiv = self;
        const updateBaseSize = () => {
          state.outerSize = makeSize(
            outerDiv.offsetWidth,
            outerDiv.offsetHeight,
          );
          internal.updateScaling();
        };
        const cleanup = observeElementSize(outerDiv, updateBaseSize);
        internal.addCleanupFn(cleanup);
      },
      setupObserveUnitSize(unitInstance: HsUnitInstance) {
        const cleanup = unitInstance.subscribeViewSize((viewSize) => {
          state.unitViewSize = viewSize;
          internal.updateScaling();
        });
        internal.addCleanupFn(cleanup);
      },
    };

    internal.setupObserveOuterSize();

    unitFrame.onUnitInstanceLoaded = (unitInstance) => {
      internal.setupObserveUnitSize(unitInstance);
      this.onUnitInstanceLoaded?.(unitInstance);
    };
  }
}

export function registerCustomElements(hostSystem: HostSystem): void {
  moduleLocal.hostSystem = hostSystem;
  customElements.define("unit-frame", UnitFrame);
  customElements.define("unit-frame-scaled", UnitFrameScaled);
}

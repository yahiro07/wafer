import { HostSystem, HsUnitInstance } from "../../core";
import { UnitInterface, UnitInterfaceProvider } from "../../unit-types";

/*
There are two type of web-component units implementation patterns.

//(A) non-sharable web-components unit (easy to implement, but less efficient)

const unitInterface = window.queryUnitInterfaceForModule("wafer-v01", import.meta.url);
const mySynth = new MySynth();
mySynth.connectTo(unitInterface.audioOutputPort);

unitInterface.completeSetup({
  unitAspects: {
    unitType: "instrument",
  },
  ...
})

class MyUnit extends HTMLElement {
  connectedCallback() {
    //render shadow dom
  }
}

//(B) sharable web-components unit (good efficiency, recommended)

class MyUnit extends HTMLElement {
  static supportsSharableUnitClass = true;

  setupUnit(unitInstantiateContext: UnitInstantiateContext) {
    const unitInterface = unitInstantiateContext.queryUnitInterface("wafer-v01");
    const mySynth = new MySynth(unitInterface);

    unitInterface.completeSetup({
      unitAspects: {
        unitType: "instrument",
      },
      ...
    })
  }

  connectedCallback() {
    //render shadow dom
  }
}

*/

function createLoaderNonSharable() {
  const customElementUnitInterfaceMap = new Map();

  (window as any).queryUnitInterfaceForModule = (
    versionCode: string,
    requestModuleUrl: string,
  ) => {
    if (versionCode !== "wafer-v01") {
      console.warn(`incompatible unit interface version: ${versionCode}`);
      return undefined;
    }
    return customElementUnitInterfaceMap.get(requestModuleUrl);
  };

  async function loadUnitElementClass(
    url: string,
    unitInterface: UnitInterface,
  ): Promise<string> {
    const tagName = `unit-${Math.random().toString().slice(2, 8)}`;
    const moduleUrl = `${location.origin}${url}?tagName=${tagName}`;
    customElementUnitInterfaceMap.set(moduleUrl, unitInterface);

    const unitElementClass = await import(/* @vite-ignore */ moduleUrl).then(
      (module) => module.default,
    );
    customElementUnitInterfaceMap.delete(moduleUrl);

    customElements.define(tagName, unitElementClass);
    return tagName;
  }

  return { loadUnitElementClass };
}
const loaderNonSharable = createLoaderNonSharable();

function createLoaderSharable() {
  type LoadingItem = {
    tagName: string;
    unitElementClassPromise: Promise<void>;
  };
  const loadingItemMap: Record<string, LoadingItem> = {};

  async function loadUnitElementClass(url: string): Promise<string> {
    let loadingItem = loadingItemMap[url];
    if (!loadingItem) {
      const tagName = `unit-${Math.random().toString().slice(2, 8)}`;
      const unitElementClassPromise = (async () => {
        const unitElementClass = await import(/* @vite-ignore */ url).then(
          (module) => module.default,
        );
        customElements.define(tagName, unitElementClass);
      })();
      loadingItem = loadingItemMap[url] = {
        tagName,
        unitElementClassPromise,
      };
    }
    await loadingItem.unitElementClassPromise;
    return loadingItem.tagName;
  }

  function instantiateSharableUnitClassUnit(
    tagName: string,
    unitInterface: UnitInterface,
  ): HTMLElement {
    const element = document.createElement(tagName);

    const unitInstantiateContext: UnitInterfaceProvider = {
      queryUnitInterface(versionCode: string) {
        if (versionCode !== "wafer-v01") {
          console.warn(`incompatible unit interface version: ${versionCode}`);
          return undefined;
        }
        return unitInterface;
      },
    };
    (element as any).setupUnit(unitInstantiateContext);

    return element;
  }

  return { loadUnitElementClass, instantiateSharableUnitClassUnit };
}
const loaderSharable = createLoaderSharable();

async function loadUnitElement(
  url: string,
  unitInterface: UnitInterface,
): Promise<HTMLElement> {
  const isSharableUnitClass = url.endsWith(".sharable.js");
  if (isSharableUnitClass) {
    const tagName = await loaderSharable.loadUnitElementClass(url);
    return loaderSharable.instantiateSharableUnitClassUnit(
      tagName,
      unitInterface,
    );
  } else {
    const tagName = await loaderNonSharable.loadUnitElementClass(
      url,
      unitInterface,
    );
    return document.createElement(tagName);
  }
}

export function createCustomElementUnitInstantiationPromise(
  unitId: string,
  url: string,
  hostSystem: HostSystem,
  callbacks: {
    onElementCreated: (element: HTMLElement) => void;
    onInstanceLoaded: (unitInstance: HsUnitInstance) => void;
  },
) {
  return new Promise<HsUnitInstance>(
    // oxlint-disable-next-line no-async-promise-executor
    async (resolve) => {
      const unitInterface = hostSystem.linkageApi.createUnitInterface(
        unitId,
        (unitInstance) => {
          callbacks.onInstanceLoaded(unitInstance);
          resolve(unitInstance);
        },
      );
      const element = await loadUnitElement(url, unitInterface);
      callbacks.onElementCreated(element);
    },
  );
}

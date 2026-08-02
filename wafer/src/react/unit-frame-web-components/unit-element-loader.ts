import { HostSystem, HsUnitInstance } from "../../core";
import { UnitInterface, UnitInterfaceProvider } from "../../unit-types";

type UnitSetupContextItem = {
  unitInterface: UnitInterface;
};

const setupContextMap = new Map<string, UnitSetupContextItem>();

/*
There are two type of web-component units implementation patterns.
We first try to initialize the unit assuming it is (A), then if not, we try (B).


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
async function loadUnitElementClass(
  moduleUrl: string,
  unitInterface: UnitInterface,
): Promise<{
  tagName: string;
  unitElementClass: CustomElementConstructor;
  isSharableUnitClass: boolean;
}> {
  const tagName = `unit-${Math.random().toString().slice(2, 8)}`;

  if (!moduleUrl.startsWith("http")) {
    moduleUrl = location.origin + moduleUrl;
  }
  moduleUrl += `?tagName=${tagName}`;

  setupContextMap.set(moduleUrl, { unitInterface });

  let globalUnitInterfaceQueried = false;

  (window as any).queryUnitInterfaceForModule = (
    versionCode: string,
    requestModuleUrl: string,
  ) => {
    globalUnitInterfaceQueried = true;
    const item = setupContextMap.get(requestModuleUrl);
    if (item) {
      if (versionCode === "wafer-v01" || versionCode === "wus-v01") {
        return item.unitInterface;
      } else {
        console.warn(
          `incompatible unit interface version: ${versionCode} for module ${moduleUrl}`,
        );
        return undefined;
      }
    }
    return undefined;
  };

  const unitElementClass = (await import(moduleUrl).then(
    (module) => module.default,
  )) as any;

  const isSharableUnitClass =
    !globalUnitInterfaceQueried &&
    unitElementClass.supportsSharableUnitClass !== undefined;

  return { tagName, unitElementClass, isSharableUnitClass };
}

type UnitClassTagEntry = {
  tagName: string;
  isSharableUnitClass: boolean;
};
const sharableUnitClassTagNameMap = new Map<string, UnitClassTagEntry>();

async function wrapLoadUnitElementClass(
  moduleUrl: string,
  unitInterface: UnitInterface,
): Promise<UnitClassTagEntry> {
  if (sharableUnitClassTagNameMap.has(moduleUrl)) {
    return sharableUnitClassTagNameMap.get(moduleUrl)!;
  }
  const res = await loadUnitElementClass(moduleUrl, unitInterface);
  // console.log([moduleUrl, res.isSharableUnitClass, res.tagName]);
  if (res.isSharableUnitClass) {
    //it's possible that sharable unit class is loaded duplicated in first loading,
    //so we simply ignore later one and use first one's cached tag.
    if (sharableUnitClassTagNameMap.has(moduleUrl)) {
      return sharableUnitClassTagNameMap.get(moduleUrl)!;
    }
    const entry = { tagName: res.tagName, isSharableUnitClass: true };
    customElements.define(res.tagName, res.unitElementClass);
    sharableUnitClassTagNameMap.set(moduleUrl, entry);
    return entry;
  } else {
    customElements.define(res.tagName, res.unitElementClass);
    return { tagName: res.tagName, isSharableUnitClass: false };
  }
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

async function loadUnitElement(
  moduleUrl: string,
  unitInterface: UnitInterface,
): Promise<HTMLElement> {
  const res = await wrapLoadUnitElementClass(moduleUrl, unitInterface);
  if (res.isSharableUnitClass) {
    return instantiateSharableUnitClassUnit(res.tagName, unitInterface);
  } else {
    return document.createElement(res.tagName);
  }
}

export function createUnitInstantiationPromise(
  unitId: string,
  scriptUrl: string,
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
      const element = await loadUnitElement(scriptUrl, unitInterface);
      callbacks.onElementCreated(element);
    },
  );
}

import { CSSProperties, useEffect, useMemo, useRef } from "react";
import { createUnitInterface, HostSystem, HsUnitInstance } from "../../core";
import { UnitInterface } from "../../unit-types";
import { mergeStyleWithFrameSize } from "../../utils/frame-size-helper";
import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";

type Props = {
  unitId: string;
  scriptUrl: string;
  destSpec?: string;
  className?: string;
  style?: CSSProperties;
  frameSize?: { width: number; height: number };
  inputNotes?: number[];
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
};

type UnitSetupContextItem = {
  unitInterface: UnitInterface;
  // unitInterfaceV01: UnitInterfaceV01;
};

const setupContextMap = new Map<string, UnitSetupContextItem>();

async function loadUnitElementClass(
  tagName: string,
  moduleUrl: string,
  unitInterface: UnitInterface,
  // unitInterfaceV01: UnitInterfaceV01,
) {
  if (!moduleUrl.startsWith("http")) {
    moduleUrl = location.origin + moduleUrl;
  }
  moduleUrl += `?tagName=${tagName}`;

  setupContextMap.set(moduleUrl, {
    unitInterface,
    // unitInterfaceV01,
  });

  (window as any).queryUnitInterfaceForModule = (
    versionCode: string,
    requestModuleUrl: string,
  ) => {
    // console.log("CE queryUnitInterfaceForModule", {
    //   moduleUrl,
    //   requestModuleUrl,
    //   versionCode,
    // });
    const item = setupContextMap.get(requestModuleUrl);
    if (item) {
      if (versionCode === "wafer-v01" || versionCode === "wus-v01") {
        return item.unitInterface;
      }
      //  else if (versionCode === "wus-v02") {
      //   // return item.unitInterface;
      // }
      else {
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

  customElements.define(tagName, unitElementClass);
}

function createUnitInstantiationPromise(
  unitId: string,
  scriptUrl: string,
  hostSystem: HostSystem,
  callbacks: {
    onElementCreated: (element: HTMLElement) => void;
    onInstanceLoaded: (unitInstance: HsUnitInstance) => void;
  },
) {
  return new Promise<HsUnitInstance>(
    // biome-ignore lint/suspicious/noAsyncPromiseExecutor: rough impl
    async (resolve) => {
      const tagName = `unit-${Math.random().toString().slice(2, 8)}`;

      const unitInterface = createUnitInterface(
        hostSystem,
        unitId,
        (unitInstance) => {
          callbacks.onInstanceLoaded(unitInstance);
          resolve(unitInstance);
        },
      );
      // const unitInterfaceV01 = createUnitInterfaceV01(
      //   hostSystem,
      //   unitId,
      //   (unitInstance) => {
      //     callbacks.onInstanceLoaded(unitInstance);
      //     resolve(unitInstance);
      //   },
      // );
      await loadUnitElementClass(tagName, scriptUrl, unitInterface);

      const element = document.createElement(tagName);
      callbacks.onElementCreated(element);
    },
  );
}

//per instance module loading, forward initialization
export const CustomElementUnitFrameFI = ({
  unitId,
  scriptUrl,
  destSpec,
  className,
  style,
  frameSize,
  inputNotes,
  onUnitInstanceLoaded,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const unitInstanceRef = useRef<HsUnitInstance>(null);

  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  const mergedStyle = useMemo(
    () => mergeStyleWithFrameSize(style, frameSize),
    [style, frameSize],
  );

  useEffect(() => {
    hostSystem.reserveConnectionChange(unitId, destSpec);
  }, [unitId, destSpec, hostSystem]);

  useEffect(() => {
    if (containerRef.current) {
      const container = containerRef.current;
      let createdElement: HTMLElement | undefined;

      const unitInstantiationPromise = createUnitInstantiationPromise(
        unitId,
        scriptUrl,
        hostSystem,
        {
          onElementCreated(element) {
            createdElement = element;
            container.appendChild(element);
          },
          onInstanceLoaded(instance) {
            unitInstanceRef.current = instance;
            onUnitInstanceLoaded?.(instance);
          },
        },
      );
      const unregisterUnit = hostSystem.registerPendingUnitInstancePromise(
        unitId,
        unitInstantiationPromise,
      );
      return () => {
        unregisterUnit();
        if (createdElement) {
          container.removeChild(createdElement);
        }
      };
    }
  }, [scriptUrl, hostSystem, unitId, onUnitInstanceLoaded]);

  useEffect(() => {
    if (hostBpm) {
      unitInstanceRef.current?.hostCallbacks?.setBpm?.(hostBpm);
    }
  }, [hostBpm]);

  useEffect(() => {
    const unit = unitInstanceRef.current;
    if (hostPlaying && unit) {
      unit.hostCallbacks?.setPlayState?.(true);
      return () => unit.hostCallbacks?.setPlayState?.(false);
    }
  }, [hostPlaying]);

  useUnitInputNotesAffecter(unitInstanceRef.current, inputNotes);

  return <div ref={containerRef} className={className} style={mergedStyle} />;
};

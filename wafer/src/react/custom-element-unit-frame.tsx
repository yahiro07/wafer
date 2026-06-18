import { CSSProperties, useEffect, useMemo, useRef } from "react";
import { createUnitInterface, HostSystem, HsUnitInstance } from "../core";
import { UnitInterface, UnitInterfaceProvider } from "../unit-types";
import { mergeStyleWithFrameSize } from "../utils/frame-size-helper";
import { useHostAppContext } from "./host-app-context";
import { loadUnitElementClassCached } from "./unit-element-loader";
import { useUnitInputNotesAffecter } from "./use-unit-input-notes-affecter";

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

      await loadUnitElementClassCached(tagName, scriptUrl);

      const element = document.createElement(tagName);

      const unitInterface: UnitInterface | undefined = createUnitInterface(
        hostSystem,
        unitId,
        (unitInstance) => {
          callbacks.onInstanceLoaded(unitInstance);
          resolve(unitInstance);
        },
      );
      const unitInstantiateContext: UnitInterfaceProvider = {
        queryUnitInterface(versionCode: string) {
          if (versionCode !== "wus-v02") {
            console.warn(
              `incompatible unit interface version: ${versionCode} for ${unitId}`,
            );
            return undefined;
          }
          return unitInterface;
        },
      };
      (element as any).setupUnit(unitInstantiateContext);
      callbacks.onElementCreated(element);
    },
  );
}

export const CustomElementUnitFrame__untestedYet = ({
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

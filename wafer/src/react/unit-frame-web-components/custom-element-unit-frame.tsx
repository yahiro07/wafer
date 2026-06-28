import { CSSProperties, useEffect, useMemo, useRef } from "react";
import { HsUnitInstance } from "../../core";
import { mergeStyleWithFrameSize } from "../../utils/frame-size-helper";
import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import { createUnitInstantiationPromise } from "./unit-element-loader";

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

export const CustomElementUnitFrame = ({
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

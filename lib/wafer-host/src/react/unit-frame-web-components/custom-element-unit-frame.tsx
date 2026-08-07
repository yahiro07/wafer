import { useEffect, useRef, useState } from "react";
import { HsUnitInstance } from "../../core";
import { checkUnitIdValidity } from "../../core/host-system/id-format-checker";
import { UnitDestinationSpec } from "../destination-spec";

import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import { createCustomElementUnitInstantiationPromise } from "./unit-element-loader";
import { extendFrameSizeToFillAspectRatio } from "../frame-size-helper";
import { useAffectUnitSourcedConnections } from "../use-affect-unit-sourced-connections";

type Props = {
  unitId: string;
  scriptUrl: string;
  destSpec?: UnitDestinationSpec;
  className?: string;
  inputNotes?: number[];
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
  frameAspectRatio?: number;
};

export const CustomElementUnitFrame = ({
  unitId,
  scriptUrl,
  destSpec,
  className,
  inputNotes,
  onUnitInstanceLoaded,
  frameAspectRatio,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const unitInstanceRef = useRef<HsUnitInstance>(null);
  const [size, setSize] = useState<[number, number] | undefined>();

  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  useAffectUnitSourcedConnections(unitId, destSpec, hostSystem);

  // biome-ignore lint/correctness/useExhaustiveDependencies: manual management
  useEffect(() => {
    if (containerRef.current) {
      checkUnitIdValidity(unitId);

      const container = containerRef.current;
      let createdElement: HTMLElement | undefined;

      const unitInstantiationPromise =
        createCustomElementUnitInstantiationPromise(
          unitId,
          scriptUrl,
          hostSystem,
          {
            onElementCreated(element) {
              createdElement = element;
              element.style.width = "100%";
              element.style.height = "100%";
              container.appendChild(element);
            },
            onInstanceLoaded(instance) {
              const { viewSize } = instance;
              if (viewSize) {
                const sz =
                  frameAspectRatio && !instance.preferJustSize
                    ? extendFrameSizeToFillAspectRatio(
                        viewSize,
                        frameAspectRatio,
                      )
                    : viewSize;
                setSize(sz);
              }
              unitInstanceRef.current = instance;
              onUnitInstanceLoaded?.(instance);
            },
          },
        );
      const unregisterUnit =
        hostSystem.linkageApi.registerPendingUnitInstancePromise(
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
  }, [scriptUrl, hostSystem, unitId]);

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

  return (
    <div
      ref={containerRef}
      className={className}
      style={
        size ? { width: `${size[0]}px`, height: `${size[1]}px` } : undefined
      }
    />
  );
};

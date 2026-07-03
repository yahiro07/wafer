import { useEffect, useRef } from "react";
import { HsUnitInstance } from "../../core";
import { checkUnitIdValidity } from "../../core/host-system/id-format-checker";
import {
  serializeUnitDestinationSpec,
  UnitDestinationSpec,
} from "../destination-spec";

import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import { createUnitInstantiationPromise } from "./unit-element-loader";

type Props = {
  unitId: string;
  scriptUrl: string;
  destSpec?: UnitDestinationSpec;
  className?: string;
  inputNotes?: number[];
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
};

export const CustomElementUnitFrame = ({
  unitId,
  scriptUrl,
  destSpec: destSpecInput,
  className,
  inputNotes,
  onUnitInstanceLoaded,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const unitInstanceRef = useRef<HsUnitInstance>(null);

  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  const destSpec = serializeUnitDestinationSpec(destSpecInput);

  useEffect(() => {
    hostSystem.reserveConnectionChange(unitId, destSpec);
  }, [unitId, destSpec, hostSystem]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: manual management
  useEffect(() => {
    if (containerRef.current) {
      checkUnitIdValidity(unitId);

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

  return <div ref={containerRef} className={className} />;
};

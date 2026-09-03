import { useEffect, useRef } from "react";
import { HsUnitInstance } from "../../core";
import { checkUnitIdValidity } from "../../core/host-system/id-format-checker";
import { UnitDestinationSpec } from "../destination-spec";
import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import { loadCustomElementUnitInstance } from "./unit-element-loader";
import { useAffectUnitSourcedConnections } from "../use-affect-unit-sourced-connections";
import { safeInvoke } from "../../core/host-system/wrap-unit-call";

type Props = {
  unitId: string;
  scriptUrl: string;
  destSpec?: UnitDestinationSpec;
  className?: string;
  inputNotes?: number[];
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
  onLoadFailed?(): void;
};

export const CustomElementUnitFrame = ({
  unitId,
  scriptUrl,
  destSpec,
  className,
  inputNotes,
  onUnitInstanceLoaded,
  onLoadFailed,
}: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const unitInstanceRef = useRef<HsUnitInstance>(null);

  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  useAffectUnitSourcedConnections(unitId, destSpec, hostSystem);

  // biome-ignore lint/correctness/useExhaustiveDependencies: manual management
  useEffect(() => {
    if (containerRef.current) {
      if (!checkUnitIdValidity(unitId)) {
        console.warn(`Invalid unit id: ${unitId}`);
        onLoadFailed?.();
        return;
      }

      const container = containerRef.current;
      let createdElement: HTMLElement | undefined;

      const cleanupFn = loadCustomElementUnitInstance(
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
            unitInstanceRef.current = instance;
            onUnitInstanceLoaded?.(instance);
          },
          onLoadFailed,
        },
      );
      return () => {
        cleanupFn();
        if (createdElement) {
          container.removeChild(createdElement);
        }
      };
    }
  }, [scriptUrl, hostSystem, unitId]);

  useEffect(() => {
    if (hostBpm) {
      safeInvoke(unitInstanceRef.current?.hostCallbacks?.setBpm)?.(hostBpm);
    }
  }, [hostBpm]);

  useEffect(() => {
    const unit = unitInstanceRef.current;
    if (hostPlaying && unit) {
      safeInvoke(unit.hostCallbacks?.setPlayState)?.(true);
      return () => safeInvoke(unit.hostCallbacks?.setPlayState)?.(false);
    }
  }, [hostPlaying]);

  useUnitInputNotesAffecter(unitInstanceRef.current, inputNotes);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%" }}
    />
  );
};

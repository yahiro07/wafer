import { useEffect, useLayoutEffect, useRef } from "react";
import { HsUnitInstance } from "../../core";
import { checkUnitIdValidity } from "../../core/host-system/id-format-checker";
import { UnitDestinationSpec } from "../destination-spec";
import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import { loadIframeUnitInstance } from "./iframe-unit-loader";
import { useAffectUnitSourcedConnections } from "../use-affect-unit-sourced-connections";

type Props = {
  unitId: string;
  pageUrl: string;
  destSpec?: UnitDestinationSpec;
  className?: string;
  inputNotes?: number[];
  onIframeMounted?(iframe: HTMLIFrameElement): (() => void) | void;
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
  onLoadFailed?(): void;
};

export const IFrameUnitFrame = ({
  unitId,
  pageUrl,
  destSpec,
  className,
  inputNotes,
  onIframeMounted,
  onUnitInstanceLoaded,
  onLoadFailed,
}: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const unitInstanceRef = useRef<HsUnitInstance>(null);

  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  useAffectUnitSourcedConnections(unitId, destSpec, hostSystem);

  // biome-ignore lint/correctness/useExhaustiveDependencies: manual management
  useLayoutEffect(() => {
    checkUnitIdValidity(unitId);
    return loadIframeUnitInstance(hostSystem, unitId, iframeRef.current!, {
      onIframeMounted,
      onUnitInstanceLoaded,
      onLoadFailed,
      unitInstanceRef,
    });
  }, [pageUrl, hostSystem, unitId]);

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
    <iframe
      key={pageUrl}
      className={className}
      style={{ width: "100%", height: "100%", border: "none" }}
      ref={iframeRef}
      src={pageUrl}
      title={unitId}
    />
  );
};

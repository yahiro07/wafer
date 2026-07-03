import { useEffect, useRef, useState } from "react";
import { HsUnitInstance } from "../../core";
import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import { loadIframeUnitInstance } from "./iframe-unit-loader";

type Props = {
  unitId: string;
  pageUrl: string;
  destSpec?: string;
  className?: string;
  inputNotes?: number[];
  onIframeMounted?(iframe: HTMLIFrameElement): (() => void) | undefined;
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
};

export const UnitFrame = ({
  unitId,
  pageUrl,
  destSpec,
  className,
  inputNotes,
  onIframeMounted,
  onUnitInstanceLoaded,
}: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const unitInstanceRef = useRef<HsUnitInstance>(null);

  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  const [size, setSize] = useState<[number, number] | undefined>();

  useEffect(() => {
    hostSystem.reserveConnectionChange(unitId, destSpec);
  }, [unitId, destSpec, hostSystem]);

  useEffect(() => {
    const handleLoaded = (unitInstance: HsUnitInstance) => {
      setSize(unitInstance.viewSize);
      onUnitInstanceLoaded?.(unitInstance);
    };
    return loadIframeUnitInstance(hostSystem, unitId, iframeRef.current!, {
      onIframeMounted,
      onUnitInstanceLoaded: handleLoaded,
      unitInstanceRef,
    });
  }, [pageUrl, hostSystem, unitId, onIframeMounted, onUnitInstanceLoaded]);

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
      style={
        size ? { width: `${size[0]}px`, height: `${size[1]}px` } : undefined
      }
      ref={iframeRef}
      src={pageUrl}
      title={unitId}
    />
  );
};

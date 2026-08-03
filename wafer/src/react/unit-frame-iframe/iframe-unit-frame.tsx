import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { HsUnitInstance } from "../../core";
import { checkUnitIdValidity } from "../../core/host-system/id-format-checker";
import {
  serializeUnitDestinationSpec,
  UnitDestinationSpec,
} from "../destination-spec";
import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import { loadIframeUnitInstance } from "./iframe-unit-loader";
import { extendFrameSizeToFillAspectRatio } from "../frame-size-helper";

type Props = {
  unitId: string;
  pageUrl: string;
  destSpec?: UnitDestinationSpec;
  className?: string;
  inputNotes?: number[];
  onIframeMounted?(iframe: HTMLIFrameElement): (() => void) | undefined;
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
  frameAspectRatio?: number;
};

export const IFrameUnitFrame = ({
  unitId,
  pageUrl,
  destSpec: destSpecInput,
  className,
  inputNotes,
  onIframeMounted,
  onUnitInstanceLoaded,
  frameAspectRatio,
}: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const unitInstanceRef = useRef<HsUnitInstance>(null);

  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  const [size, setSize] = useState<[number, number] | undefined>();

  const destSpec = serializeUnitDestinationSpec(destSpecInput);

  useEffect(() => {
    hostSystem.linkageApi.reserveConnectionChange(unitId, destSpec);
  }, [unitId, destSpec, hostSystem]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: manual management
  useLayoutEffect(() => {
    checkUnitIdValidity(unitId);
    const handleLoaded = (unitInstance: HsUnitInstance) => {
      const { viewSize } = unitInstance;
      if (viewSize) {
        const sz =
          frameAspectRatio && !unitInstance.preferJustSize
            ? extendFrameSizeToFillAspectRatio(viewSize, frameAspectRatio)
            : viewSize;
        setSize(sz);
      }
      onUnitInstanceLoaded?.(unitInstance);
    };
    return loadIframeUnitInstance(hostSystem, unitId, iframeRef.current!, {
      onIframeMounted,
      onUnitInstanceLoaded: handleLoaded,
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
      style={
        size ? { width: `${size[0]}px`, height: `${size[1]}px` } : undefined
      }
      ref={iframeRef}
      src={pageUrl}
      title={unitId}
    />
  );
};

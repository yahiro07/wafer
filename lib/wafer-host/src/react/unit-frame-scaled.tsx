import { useEffect, useMemo, useRef, useState } from "react";
import { HsUnitInstance } from "../core";
import { UnitFrame } from "./unit-frame";
import { UnitDestinationSpec } from "./destination-spec";

type Props = {
  unitId: string;
  unitUrl: string;
  destSpec?: UnitDestinationSpec;
  className?: string;
  inputNotes?: number[];
  onIframeMounted?(iframe: HTMLIFrameElement): (() => void) | undefined;
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
};

type Size = { width: number; height: number };

const makeSize = (width: number, height: number): Size => ({ width, height });

function observeElementSize(el: HTMLElement, callback: (size: Size) => void) {
  const updateSize = () => {
    callback(makeSize(el.offsetWidth, el.offsetHeight));
  };
  const ro = new ResizeObserver(updateSize);
  ro.observe(el);
  return () => ro.disconnect();
}

export const UnitFrameScaled = ({
  unitId,
  unitUrl,
  destSpec,
  className,
  inputNotes,
  onIframeMounted,
  onUnitInstanceLoaded,
}: Props) => {
  const outerDivRef = useRef<HTMLDivElement>(null);
  const [outerSize, setOuterSize] = useState<Size | null>(null);
  const [unitInstance, setUnitInstance] = useState<HsUnitInstance | null>(null);
  const [unitViewSize, setUnitViewSize] = useState<Size | null>(null);

  useEffect(() => {
    const outerDiv = outerDivRef.current!;
    const updateOuterSize = () => {
      const size = makeSize(outerDiv.offsetWidth, outerDiv.offsetHeight);
      setOuterSize(size);
    };
    observeElementSize(outerDiv, updateOuterSize);
  }, []);

  const handleUnitInstanceLoaded = (unit: HsUnitInstance) => {
    setUnitInstance(unit);
    onUnitInstanceLoaded?.(unit);
  };
  useEffect(() => {
    if (unitInstance) {
      return unitInstance.subscribeViewSize(setUnitViewSize);
    }
  }, [unitInstance]);

  const scale = useMemo(() => {
    const innerSize = unitViewSize;
    if (outerSize && innerSize) {
      const scale = Math.min(
        outerSize.width / innerSize.width,
        outerSize.height / innerSize.height,
      );
      // console.log(unitId, outerSize, innerSize, scale);
      return scale;
    } else {
      return 1;
    }
  }, [outerSize, unitViewSize]);

  return (
    <div
      ref={outerDivRef}
      className={className}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: `${100 / scale}%`,
          height: `${100 / scale}%`,
          transform: `scale(${scale})`,
          transformOrigin: "center",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <UnitFrame
          unitId={unitId}
          unitUrl={unitUrl}
          destSpec={destSpec}
          inputNotes={inputNotes}
          onIframeMounted={onIframeMounted}
          onUnitInstanceLoaded={handleUnitInstanceLoaded}
        />
      </div>
    </div>
  );
};

import { useRef, useState } from "react";
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

export const UnitFrameScaled = ({
  unitId,
  unitUrl,
  destSpec,
  className,
  inputNotes,
  onIframeMounted,
  onUnitInstanceLoaded,
}: Props) => {
  const baseDivRef = useRef<HTMLDivElement>(null);
  const [baseAsr, setBaseAsr] = useState(1.6);
  const [scale, setScale] = useState(1);
  const handleUnitInstanceLoaded = (unit: HsUnitInstance) => {
    const baseEl = baseDivRef.current;
    if (!baseEl) return;
    const bounds = baseEl.getBoundingClientRect();
    const [w, h] = unit.viewSize;
    setBaseAsr(bounds.width / bounds.height);
    setScale(Math.min(bounds.width / w, bounds.height / h));
    onUnitInstanceLoaded?.(unit);
  };
  return (
    <div
      ref={baseDivRef}
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
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          transform: `scale(${scale})`,
        }}
      >
        <UnitFrame
          unitId={unitId}
          unitUrl={unitUrl}
          destSpec={destSpec}
          inputNotes={inputNotes}
          onIframeMounted={onIframeMounted}
          onUnitInstanceLoaded={handleUnitInstanceLoaded}
          frameAspectRatio={baseAsr}
        />
      </div>
    </div>
  );
};

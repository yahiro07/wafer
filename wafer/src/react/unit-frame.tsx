import { HsUnitInstance } from "../core";
import { UnitDestinationSpec } from "./destination-spec";
import { IFrameUnitFrame } from "./unit-frame-iframe/iframe-unit-frame";
import { CustomElementUnitFrame } from "./unit-frame-web-components/custom-element-unit-frame";

type Props = {
  unitId: string;
  unitUrl: string;
  destSpec?: UnitDestinationSpec;
  className?: string;
  inputNotes?: number[];
  onIframeMounted?(iframe: HTMLIFrameElement): (() => void) | undefined;
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
  frameAspectRatio?: number;
};

export const UnitFrame = ({
  unitId,
  unitUrl,
  destSpec,
  className,
  inputNotes,
  onIframeMounted,
  onUnitInstanceLoaded,
  frameAspectRatio,
}: Props) => {
  if (unitUrl.endsWith("/index.js")) {
    return (
      <CustomElementUnitFrame
        unitId={unitId}
        scriptUrl={unitUrl}
        destSpec={destSpec}
        className={className}
        inputNotes={inputNotes}
        onUnitInstanceLoaded={onUnitInstanceLoaded}
      />
    );
  } else {
    return (
      <IFrameUnitFrame
        unitId={unitId}
        pageUrl={unitUrl}
        destSpec={destSpec}
        className={className}
        inputNotes={inputNotes}
        onIframeMounted={onIframeMounted}
        onUnitInstanceLoaded={onUnitInstanceLoaded}
        frameAspectRatio={frameAspectRatio}
      />
    );
  }
};

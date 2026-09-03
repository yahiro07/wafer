import { useEffect, useMemo } from "react";
import { HsUnitInstance } from "../../core";
import { checkUnitIdValidity } from "../../core/host-system/id-format-checker";
import { UnitDestinationSpec } from "../destination-spec";
import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import {
  instantiateReactUnit,
  ReactUnitTemplateFn,
} from "./react-unit-interface";
import { useAffectUnitSourcedConnections } from "../use-affect-unit-sourced-connections";
import { safeInvoke } from "../../core/host-system/wrap-unit-call";

type Props = {
  unitId: string;
  unitTemplateFn: ReactUnitTemplateFn;
  destSpec?: UnitDestinationSpec;
  inputNotes?: number[];
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
};

const ReactUnitFrameImpl = ({
  unitId,
  unitTemplateFn,
  destSpec,
  inputNotes,
  onUnitInstanceLoaded,
}: Props) => {
  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  const unit = useMemo(() => {
    return instantiateReactUnit(hostSystem, unitTemplateFn, unitId);
  }, [unitTemplateFn, unitId, hostSystem]);
  useEffect(() => {
    onUnitInstanceLoaded?.(unit);
    return hostSystem.linkageApi.registerUnitInstance(unit);
  }, [unit, onUnitInstanceLoaded, hostSystem]);

  useAffectUnitSourcedConnections(unitId, destSpec, hostSystem);

  useEffect(() => {
    if (hostBpm) {
      safeInvoke(unit.hostCallbacks?.setBpm)?.(hostBpm);
    }
  }, [hostBpm, unit]);

  useEffect(() => {
    if (hostPlaying) {
      safeInvoke(unit.hostCallbacks?.setPlayState)?.(true);
      return () => safeInvoke(unit.hostCallbacks?.setPlayState)?.(false);
    }
  }, [hostPlaying, unit]);

  useUnitInputNotesAffecter(unit, inputNotes);

  return <unit.RenderUi />;
};

export const ReactUnitFrame = ({
  unitId,
  unitTemplateFn,
  destSpec,
  inputNotes,
  onUnitInstanceLoaded,
}: Props) => {
  const valid = useMemo(() => checkUnitIdValidity(unitId), [unitId]);
  if (!valid) {
    return <div>Invalid unit id: {unitId}</div>;
  }
  return (
    <ReactUnitFrameImpl
      unitId={unitId}
      unitTemplateFn={unitTemplateFn}
      destSpec={destSpec}
      inputNotes={inputNotes}
      onUnitInstanceLoaded={onUnitInstanceLoaded}
    />
  );
};

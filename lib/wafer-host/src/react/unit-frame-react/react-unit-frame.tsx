import { useEffect, useMemo, useRef } from "react";
import { HsUnitInstance } from "../../core";
import { checkUnitIdValidity } from "../../core/host-system/id-format-checker";
import { safeInvoke } from "../../core/host-system/wrap-unit-call";
import { UnitDestinationSpec } from "../destination-spec";
import { useHostAppContext } from "../host-app-context";
import { useAffectUnitSourcedConnections } from "../use-affect-unit-sourced-connections";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import {
  instantiateReactUnit,
  ReactUnitTemplateFn,
} from "./react-unit-interface";

type Props = {
  unitId: string;
  unitTemplateFn: ReactUnitTemplateFn;
  destSpec?: UnitDestinationSpec;
  inputNotes?: number[];
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
  viewActive?: boolean;
};

const ReactUnitFrameImpl = ({
  unitId,
  unitTemplateFn,
  destSpec,
  inputNotes,
  onUnitInstanceLoaded,
  viewActive = true,
}: Props) => {
  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  const unit = useMemo(() => {
    return instantiateReactUnit(hostSystem, unitTemplateFn, unitId);
  }, [unitTemplateFn, unitId, hostSystem]);

  useEffect(() => {
    return hostSystem.linkageApi.registerUnitInstance(unit);
  }, [unit, hostSystem]);

  const onLoadedRef = useRef(onUnitInstanceLoaded);
  onLoadedRef.current = onUnitInstanceLoaded;
  useEffect(() => {
    onLoadedRef.current?.(unit);
  }, [unit]);

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

  useEffect(() => {
    unit.unitCallbacks?.setViewActive?.(viewActive);
  }, [viewActive, unit]);

  return <unit.RenderUi />;
};

export const ReactUnitFrame = ({
  unitId,
  unitTemplateFn,
  destSpec,
  inputNotes,
  onUnitInstanceLoaded,
  viewActive,
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
      viewActive={viewActive}
    />
  );
};

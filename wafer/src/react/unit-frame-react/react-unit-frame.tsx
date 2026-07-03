import { useEffect, useMemo } from "react";
import { HsUnitInstance } from "../../core";
import {
  serializeUnitDestinationSpec,
  UnitDestinationSpec,
} from "../destination-spec";
import { useHostAppContext } from "../host-app-context";
import { useUnitInputNotesAffecter } from "../use-unit-input-notes-affecter";
import {
  instantiateReactUnit,
  ReactUnitTemplateFn,
} from "./react-unit-interface";
import { checkUnitIdValidity } from "../../core/host-system/id-format-checker";

type Props = {
  unitId: string;
  unitTemplateFn: ReactUnitTemplateFn;
  destSpec?: UnitDestinationSpec;
  inputNotes?: number[];
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
};

export const ReactUnitFrame = ({
  unitId,
  unitTemplateFn,
  destSpec: destSpecInput,
  inputNotes,
  onUnitInstanceLoaded,
}: Props) => {
  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  const unit = useMemo(() => {
    checkUnitIdValidity(unitId);
    return instantiateReactUnit(hostSystem, unitTemplateFn, unitId);
  }, [unitTemplateFn, unitId, hostSystem]);
  useEffect(() => {
    onUnitInstanceLoaded?.(unit);
    return hostSystem.registerUnitInstance(unit);
  }, [unit, onUnitInstanceLoaded, hostSystem]);

  const destSpec = serializeUnitDestinationSpec(destSpecInput);

  useEffect(() => {
    hostSystem.reserveConnectionChange(unitId, destSpec);
  }, [unitId, destSpec, hostSystem]);

  useEffect(() => {
    if (hostBpm) {
      unit.hostCallbacks?.setBpm?.(hostBpm);
    }
  }, [hostBpm, unit]);

  useEffect(() => {
    if (hostPlaying) {
      unit.hostCallbacks?.setPlayState?.(true);
      return () => unit.hostCallbacks?.setPlayState?.(false);
    }
  }, [hostPlaying, unit]);

  useUnitInputNotesAffecter(unit, inputNotes);

  return <unit.RenderUi />;
};

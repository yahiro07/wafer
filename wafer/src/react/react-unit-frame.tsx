import { useEffect, useMemo } from "react";
import { HsUnitInstance } from "../core/linkage/types";
import { useHostAppContext } from "./host-app-context";
import {
  instantiateReactUnit,
  ReactUnitTemplateFn,
} from "./react-unit-interface";
import { useUnitInputNotesAffecter } from "./use-unit-input-notes-affecter";

type Props = {
  unitId: string;
  unitTemplateFn: ReactUnitTemplateFn;
  destSpec?: string;
  inputNotes?: number[];
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
};

export const ReactUnitFrame = ({
  unitId,
  unitTemplateFn,
  destSpec,
  inputNotes,
  onUnitInstanceLoaded,
}: Props) => {
  const { hostSystem, hostBpm, hostPlaying } = useHostAppContext();

  const unit = useMemo(
    () => instantiateReactUnit(hostSystem, unitTemplateFn, unitId),
    [unitTemplateFn, unitId, hostSystem],
  );
  useEffect(() => {
    onUnitInstanceLoaded?.(unit);
    return hostSystem.registerUnitInstance(unit);
  }, [unit, onUnitInstanceLoaded, hostSystem]);

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

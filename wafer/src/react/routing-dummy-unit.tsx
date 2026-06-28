import { useEffect, useMemo } from "react";
import { useHostAppContext } from "./host-app-context";
import {
  instantiateReactUnit,
  ReactUnitTemplateFn,
} from "./unit-frame-react/react-unit-interface";

type Props = {
  unitId: string;
  destSpec?: string;
};

const routingDummyUnitTemplateFn: ReactUnitTemplateFn = (unitInterface) => {
  unitInterface.audioInputNode.connect(unitInterface.audioOutputNode);
  unitInterface.completeSetup({
    unitAspects: {
      unitType: "effect",
      outputs: ["audio"],
      inputs: ["audio"],
    },
  });
  return {
    RenderUi: () => null,
  };
};

export const RoutingDummyUnit = ({ unitId, destSpec }: Props) => {
  const { hostSystem } = useHostAppContext();

  const unit = useMemo(
    () => instantiateReactUnit(hostSystem, routingDummyUnitTemplateFn, unitId),
    [hostSystem, unitId],
  );

  useEffect(() => {
    return hostSystem.registerUnitInstance(unit);
  }, [unit, hostSystem]);

  useEffect(() => {
    hostSystem.reserveConnectionChange(unitId, destSpec);
  }, [unitId, destSpec, hostSystem]);

  return <unit.RenderUi />;
};

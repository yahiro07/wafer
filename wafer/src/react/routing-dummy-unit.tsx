import { useEffect } from "react";
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
  unitInterface.completeSetup({
    unitAspects: { unitType: "effect" },
  });
  return {
    RenderUi: () => null,
  };
};

export const RoutingDummyUnit = ({ unitId, destSpec }: Props) => {
  const { hostSystem } = useHostAppContext();

  instantiateReactUnit(hostSystem, routingDummyUnitTemplateFn, unitId);

  useEffect(() => {
    hostSystem.reserveConnectionChange(unitId, destSpec);
  }, [unitId, destSpec, hostSystem]);

  return null;
};

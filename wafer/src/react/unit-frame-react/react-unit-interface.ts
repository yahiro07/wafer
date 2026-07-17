import { ReactNode } from "react";
import { HostSystem, HsUnitInstance } from "../../core";
import { UnitInterface } from "../../unit-types";

type PlainComponentFn = () => ReactNode;

export type ReactUnitTemplateFn = (unitInterface: UnitInterface) => {
  RenderUi: PlainComponentFn;
};

type ReactUnitInstance = HsUnitInstance & {
  RenderUi: PlainComponentFn;
};

export function instantiateReactUnit(
  hostSystem: HostSystem,
  templateFn: ReactUnitTemplateFn,
  unitId: string,
): ReactUnitInstance {
  let unitInstance: HsUnitInstance | undefined;
  const unitInterface = hostSystem.linkageApi.createUnitInterface(
    unitId,
    (instance) => {
      unitInstance = instance;
    },
  );
  const { RenderUi } = templateFn(unitInterface);
  if (!unitInstance) {
    throw new Error("Unit instance was not created");
  }
  return {
    ...unitInstance,
    RenderUi,
  };
}

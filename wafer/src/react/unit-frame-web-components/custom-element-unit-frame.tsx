import { CSSProperties } from "react";
import { createUnitInterface, HostSystem, HsUnitInstance } from "../../core";
import { UnitInterface, UnitInterfaceProvider } from "../../unit-types";
import { loadUnitElementClassCached } from "./unit-element-loader";

type Props = {
  unitId: string;
  scriptUrl: string;
  destSpec?: string;
  className?: string;
  style?: CSSProperties;
  frameSize?: { width: number; height: number };
  inputNotes?: number[];
  onUnitInstanceLoaded?(unitInstance: HsUnitInstance): void;
};

function createUnitInstantiationPromise(
  unitId: string,
  scriptUrl: string,
  hostSystem: HostSystem,
  callbacks: {
    onElementCreated: (element: HTMLElement) => void;
    onInstanceLoaded: (unitInstance: HsUnitInstance) => void;
  },
) {
  return new Promise<HsUnitInstance>(
    // biome-ignore lint/suspicious/noAsyncPromiseExecutor: rough impl
    async (resolve) => {
      const tagName = `unit-${Math.random().toString().slice(2, 8)}`;

      await loadUnitElementClassCached(tagName, scriptUrl);

      const element = document.createElement(tagName);

      const unitInterface: UnitInterface | undefined = createUnitInterface(
        hostSystem,
        unitId,
        (unitInstance) => {
          callbacks.onInstanceLoaded(unitInstance);
          resolve(unitInstance);
        },
      );
      const unitInstantiateContext: UnitInterfaceProvider = {
        queryUnitInterface(versionCode: string) {
          if (versionCode !== "wus-v02") {
            console.warn(
              `incompatible unit interface version: ${versionCode} for ${unitId}`,
            );
            return undefined;
          }
          return unitInterface;
        },
      };
      (element as any).setupUnit(unitInstantiateContext);
      callbacks.onElementCreated(element);
    },
  );
}

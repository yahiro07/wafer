import { HostSystem, HsUnitInstance } from "../../core";
import { HsUnitInterface } from "../../core/linkage/types";
import { UnitInterface, UnitInterfaceProvider } from "../../unit-types";
export function loadIframeUnitInstance(
  hostSystem: HostSystem,
  unitId: string,
  iframe: HTMLIFrameElement,
  sideEffects: {
    onIframeMounted?: (iframe: HTMLIFrameElement) => (() => void) | undefined;
    onUnitInstanceLoaded?: (unitInstance: HsUnitInstance) => void;
    unitInstanceRef: React.RefObject<HsUnitInstance | null>;
  },
) {
  const cleanupIFrameCallback = sideEffects.onIframeMounted?.(iframe);
  const win = iframe.contentWindow as unknown as UnitInterfaceProvider & {
    checkUnitInterfaceCompatibility: (versionCode: string) => void;
    unitInterface?: UnitInterface;
  };

  let unitInterface: HsUnitInterface | undefined;

  const unitInstantiationPromise = new Promise<HsUnitInstance>((resolve) => {
    unitInterface = hostSystem.linkageApi.createUnitInterface(
      unitId,
      (unitInstance) => {
        sideEffects.unitInstanceRef.current = unitInstance;
        sideEffects.onUnitInstanceLoaded?.(unitInstance);
        resolve(unitInstance);
      },
    );
    win.unitInterface = unitInterface;
    win.queryUnitInterface = (versionCode: string) => {
      if (versionCode === "wafer-v01") {
        return unitInterface;
      } else {
        throw new Error(
          `incompatible unit interface version: ${versionCode} for ${unitId}`,
        );
      }
    };
  });
  const unregisterUnit =
    hostSystem.linkageApi.registerPendingUnitInstancePromise(
      unitId,
      unitInstantiationPromise,
    );
  return () => {
    unitInterface?.cancelLoading();
    unregisterUnit();
    cleanupIFrameCallback?.();
    win.iframeUnitUnloadingCallback?.();
  };
}

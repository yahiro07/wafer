import { HostSystem, HsUnitInstance } from "../../core";
import { HsUnitInterface } from "../../core/linkage/types";
import { UnitInterface, UnitInterfaceProvider } from "../../unit-types";

export function loadIframeUnitInstance(
  hostSystem: HostSystem,
  unitId: string,
  iframe: HTMLIFrameElement,
  sideEffects: {
    onIframeMounted?: (iframe: HTMLIFrameElement) => (() => void) | void;
    onUnitInstanceLoaded?: (unitInstance: HsUnitInstance) => void;
    onLoadFailed?: () => void;
    unitInstanceRef: React.RefObject<HsUnitInstance | null>;
  },
) {
  const cleanupIFrameCallback = sideEffects.onIframeMounted?.(iframe);
  const win = iframe.contentWindow as unknown as UnitInterfaceProvider & {
    checkUnitInterfaceCompatibility: (versionCode: string) => void;
    unitInterface?: UnitInterface;
  };

  let unitInterface: HsUnitInterface | undefined;
  let timeoutTimerId: NodeJS.Timeout | undefined;
  let cancelled = false;

  const unitInstantiationPromise = new Promise<HsUnitInstance>(
    (resolve, reject) => {
      unitInterface = hostSystem.linkageApi.createUnitInterface(
        unitId,
        (unitInstance) => {
          if (cancelled) return;
          sideEffects.unitInstanceRef.current = unitInstance;
          sideEffects.onUnitInstanceLoaded?.(unitInstance);
          resolve(unitInstance);
          clearTimeout(timeoutTimerId);
        },
      );
      win.queryUnitInterface = (versionCode: string) => {
        if (versionCode === "wafer-v01") {
          return unitInterface;
        } else {
          throw new Error(
            `incompatible unit interface version: ${versionCode} for ${unitId}`,
          );
        }
      };

      timeoutTimerId = setTimeout(() => {
        if (cancelled) return;
        cancelled = true;
        unitInterface?.cancelLoading();
        sideEffects.onLoadFailed?.();
        reject(new Error(`loading ${unitId} timed out`));
      }, 5000);
    },
  );

  const unregisterUnit =
    hostSystem.linkageApi.registerPendingUnitInstancePromise(
      unitId,
      unitInstantiationPromise,
    );
  return () => {
    cancelled = true;
    unitInterface?.cancelLoading();
    clearTimeout(timeoutTimerId);
    unregisterUnit();
    cleanupIFrameCallback?.();
    try {
      win.iframeUnitUnloadingCallback?.();
    } catch (err) {
      console.warn(`error on iframeUnitUnloadingCallback: ${unitId}`, err);
    }
  };
}

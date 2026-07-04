import { UnitInterface, UnitInterfaceProvider } from "./unit-interfaces";

type VersionCode = "wafer-v01";

export function queryUnitInterface(
  versionCode: VersionCode,
): UnitInterface | undefined {
  const win = window as UnitInterfaceProvider;
  return win.queryUnitInterface?.(versionCode);
}

export function queryUnitInterfaceForModule(
  versionCode: VersionCode,
  importMetaUrl: string,
): UnitInterface | undefined {
  const win = window as UnitInterfaceProvider;
  return win?.queryUnitInterfaceForModule?.(versionCode, importMetaUrl);
}

export function onIframeUnitUnloading(fn: () => void) {
  const win = window as UnitInterfaceProvider;
  win.iframeUnitUnloadingCallback = fn;
}

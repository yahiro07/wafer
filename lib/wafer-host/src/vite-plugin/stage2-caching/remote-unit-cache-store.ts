import { CachedUnitEntry, ResolvedUnitEntry } from "../common/internal-types";
import { UnitFetchMethod } from "../common/types";
import {
  isUnitCached,
  RemoteUnitCacheStorageIo,
} from "./remote-unit-cache-storage-io";
import { downloadUnitsFromRemote } from "./remote-units-downloader";

export async function cacheRemoteUnitsIfNeed(
  cacheStorageIo: RemoteUnitCacheStorageIo,
  resolvedUnitEntries: ResolvedUnitEntry[],
  fetchMethod: UnitFetchMethod,
): Promise<boolean> {
  const cacheEntries: CachedUnitEntry[] = resolvedUnitEntries
    .filter((entry) => entry.kind === "cache")
    .map((entry) => ({
      sourceUrlSpec: entry.sourceUrlSpec,
      folderPath: entry.folderPath,
      source: entry.source,
    }));

  const missingEntries: CachedUnitEntry[] = [];
  for (const entry of cacheEntries) {
    if (!(await isUnitCached(entry.folderPath))) {
      missingEntries.push(entry);
    }
  }

  if (missingEntries.length === 0) {
    return false;
  }

  await downloadUnitsFromRemote({
    entries: missingEntries,
    cacheRoot: cacheStorageIo.getCacheFolderPath(),
    fetchMethod,
  });
  return true;
}

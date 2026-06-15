import { checkDeepEquality } from "../common/common-helper";
import { ResolvedUnitEntry, UnitCacheEntry } from "../common/internal-types";
import { UnitSourceUrls } from "../common/types";
import { RemoteUnitCacheStorageIo } from "./remote-unit-cache-storage-io";
import { downloadUnitsFromRemote } from "./remote-units-downloader";

export async function checkUnitSourceUrlsChanged(
  cacheStorageIo: RemoteUnitCacheStorageIo,
  unitSourceUrls: UnitSourceUrls,
): Promise<boolean> {
  const prevUnitSourceUrls =
    await cacheStorageIo.readPreviousUnitSourceUrlsInput();
  if (prevUnitSourceUrls) {
    if (checkDeepEquality(prevUnitSourceUrls, unitSourceUrls)) {
      return false;
    }
  }
  return true;
}

export async function enumerateUnitEntriesToCache(
  resolvedUnitEntries: ResolvedUnitEntry[],
  cacheStorageIo: RemoteUnitCacheStorageIo,
): Promise<UnitCacheEntry[]> {
  const existingBucketPieceKeys =
    await cacheStorageIo.listExistingBucketPieceKeys();

  const unitCacheEntries: UnitCacheEntry[] = resolvedUnitEntries
    .filter((it) => it.kind === "cache")
    .map((resolvedUnitEntry) => {
      const { sourceUrlSpec: url, bucketName, pieceName } = resolvedUnitEntry;
      const bucketPieceComparisonKey = `${bucketName}:${pieceName}`;
      return {
        remoteUrl: url,
        bucketName: bucketName,
        pieceName: pieceName,
        bucketPieceComparisonKey,
      };
    });
  return unitCacheEntries.filter(
    (entry) =>
      !existingBucketPieceKeys.includes(entry.bucketPieceComparisonKey),
  );
}

export async function cacheRemoteUnitsIfNeed(
  cacheStorageIo: RemoteUnitCacheStorageIo,
  resolvedUnitEntries: ResolvedUnitEntry[],
  cacheFolderPath: string,
): Promise<boolean> {
  const unitEntriesToCache = await enumerateUnitEntriesToCache(
    resolvedUnitEntries,
    cacheStorageIo,
  );
  if (unitEntriesToCache.length > 0) {
    await downloadUnitsFromRemote(
      unitEntriesToCache,
      cacheStorageIo.writeCachedPiece,
      cacheFolderPath,
    );
    return true;
  }
  return false;
}

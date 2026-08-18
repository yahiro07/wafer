import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { GitHubUnitSource } from "../common/internal-types";
import {
  getCachedUnitRelativePath,
  getRepositoryRelativePath,
} from "../common/unit-url-helpers";

export type RemoteUnitCacheStorageIo = {
  getCacheFolderPath(): string;
  getUnitsCacheFolderPath(): string;
  getCachedUnitFolderPath(source: GitHubUnitSource): string;
  getRepositoryFolderPath(source: GitHubUnitSource): string;
};

export function createRemoteUnitCacheStorageIo(
  cacheFolderPath: string,
): RemoteUnitCacheStorageIo {
  const resolvedCacheFolderPath = cacheFolderPath.startsWith("~/")
    ? path.join(os.homedir(), cacheFolderPath.slice(2))
    : cacheFolderPath;

  return {
    getCacheFolderPath() {
      return resolvedCacheFolderPath;
    },
    getUnitsCacheFolderPath() {
      return path.join(resolvedCacheFolderPath, "units");
    },
    getCachedUnitFolderPath(source) {
      return path.join(
        resolvedCacheFolderPath,
        "units",
        getCachedUnitRelativePath(source),
      );
    },
    getRepositoryFolderPath(source) {
      return path.join(
        resolvedCacheFolderPath,
        "repositories",
        getRepositoryRelativePath(source),
      );
    },
  };
}

export async function isUnitCached(folderPath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(
      path.join(folderPath, "unit-meta.json"),
    );
    return stat.isFile();
  } catch {
    return false;
  }
}

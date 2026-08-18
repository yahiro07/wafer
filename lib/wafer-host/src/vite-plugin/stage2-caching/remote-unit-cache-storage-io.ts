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

export async function pruneCachedUnits(
  unitsRoot: string,
  keepFolderPaths: string[],
): Promise<void> {
  const keepSet = new Set(
    keepFolderPaths.map((folderPath) => path.resolve(folderPath)),
  );
  if (!(await directoryExists(unitsRoot))) {
    return;
  }

  const cachedUnitFolders = await findCachedUnitFolders(unitsRoot);
  for (const folderPath of cachedUnitFolders) {
    if (!keepSet.has(path.resolve(folderPath))) {
      await fs.promises.rm(folderPath, { recursive: true, force: true });
    }
  }
  await removeEmptyDirectories(unitsRoot);
}

async function directoryExists(targetPath: string): Promise<boolean> {
  try {
    const stat = await fs.promises.stat(targetPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

async function findCachedUnitFolders(unitsRoot: string): Promise<string[]> {
  const folders: string[] = [];
  for await (const relativePath of fs.promises.glob("**/unit-meta.json", {
    cwd: unitsRoot,
  })) {
    folders.push(path.join(unitsRoot, path.dirname(relativePath)));
  }
  return folders;
}

async function removeEmptyDirectories(rootPath: string): Promise<void> {
  if (!(await directoryExists(rootPath))) {
    return;
  }
  const entries = await fs.promises.readdir(rootPath, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await removeEmptyDirectories(path.join(rootPath, entry.name));
    }
  }
  const remaining = await fs.promises.readdir(rootPath);
  if (remaining.length === 0 && path.basename(rootPath) !== "units") {
    await fs.promises.rm(rootPath, { recursive: false });
  }
}

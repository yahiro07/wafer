import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { UnitMetadata } from "wus-unit-types";
import { UnitInventoriesJson } from "../common/types";

export type RemoteUnitCacheStorageIo = {
  readPreviousUnitSourceUrlsInput(): Promise<
    Record<string, string> | undefined
  >;
  writePreviousUnitSourceUrlsInput(
    unitSourceUrls: Record<string, string>,
  ): Promise<void>;
  readCachedSummariesJson(): Promise<UnitInventoriesJson | undefined>;
  writeCachedSummariesJson(summariesJson: UnitInventoriesJson): Promise<void>;
  listExistingBucketPieceKeys(): Promise<string[]>;
  writeCachedPiece(
    bucketName: string,
    pieceName: string,
    sourceUnitFolderPath: string,
  ): Promise<void>;
  readCachedPieceMeta(
    bucketName: string,
    pieceName: string,
  ): Promise<UnitMetadata | undefined>;
  getUnitsCacheFolderPath(): string;
};

export function createRemoteUnitCacheStorageIo(
  cacheFolderPath: string,
): RemoteUnitCacheStorageIo {
  const resolvedCacheFolderPath = cacheFolderPath.startsWith("~/")
    ? path.join(os.homedir(), cacheFolderPath.slice(2))
    : cacheFolderPath;

  const internal = {
    resolvePath(relativePath: string): string {
      return path.join(resolvedCacheFolderPath, relativePath);
    },
    async readJsonFile<T>(relativePath: string): Promise<T | undefined> {
      const filePath = internal.resolvePath(relativePath);
      try {
        const content = await fs.promises.readFile(filePath, "utf8");
        return JSON.parse(content) as T;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return undefined;
        }
        throw error;
      }
    },
    async writeJsonFile<T>(relativePath: string, content: T): Promise<void> {
      const filePath = internal.resolvePath(relativePath);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(
        filePath,
        `${JSON.stringify(content, null, 2)}\n`,
        "utf8",
      );
    },
    async writeFolder(relativePath: string, srcPath: string): Promise<void> {
      const destPath = internal.resolvePath(relativePath);
      await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
      await fs.promises.rm(destPath, { recursive: true, force: true });
      await fs.promises.cp(srcPath, destPath, { recursive: true });
    },
    async globFoldersTwoLevels(basePath: string): Promise<string[]> {
      const absoluteBasePath = internal.resolvePath(basePath);
      try {
        const matches: string[] = [];
        for await (const relativePath of fs.promises.glob("*/*", {
          cwd: absoluteBasePath,
        })) {
          const targetPath = path.join(absoluteBasePath, relativePath);
          const stat = await fs.promises.stat(targetPath);
          if (stat.isDirectory()) {
            matches.push(relativePath);
          }
        }
        return matches;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          return [];
        }
        throw error;
      }
    },
  };
  return {
    readPreviousUnitSourceUrlsInput() {
      return internal.readJsonFile("previous-unit-source-urls.json");
    },
    writePreviousUnitSourceUrlsInput(unitSourceUrls) {
      return internal.writeJsonFile(
        "previous-unit-source-urls.json",
        unitSourceUrls,
      );
    },
    readCachedSummariesJson() {
      return internal.readJsonFile("cached-summaries.json");
    },
    writeCachedSummariesJson(summariesJson) {
      return internal.writeJsonFile("cached-summaries.json", summariesJson);
    },
    async listExistingBucketPieceKeys() {
      const paths = await internal.globFoldersTwoLevels("units");
      return paths.map((p) => p.replace("/", ":"));
    },
    writeCachedPiece(bucketName, pieceName, sourceUnitFolderPath) {
      const destFolder = `units/${bucketName}/${pieceName}`;
      return internal.writeFolder(destFolder, sourceUnitFolderPath);
    },
    readCachedPieceMeta(bucketName, pieceName) {
      return internal.readJsonFile(
        `units/${bucketName}/${pieceName}/unit-meta.json`,
      );
    },
    getUnitsCacheFolderPath() {
      return internal.resolvePath("units");
    },
  };
}

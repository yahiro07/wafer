import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { UnitCacheEntry } from "../common/internal-types";
import { parseRemoteUnitUrl } from "../common/unit-url-helpers";

const execFileAsync = promisify(execFile);

export async function downloadUnitsFromRemote(
  unitCacheEntries: UnitCacheEntry[],
  writeCachedPiece: (
    bucketName: string,
    pieceName: string,
    sourceUnitFolderPath: string,
  ) => Promise<void>,
  cacheFolderPath: string,
) {
  console.log(
    `adding ${unitCacheEntries.length} remote unit(s) to local cache...`,
  );

  const entriesPerBuckets = Object.groupBy(
    unitCacheEntries,
    (entry) => entry.bucketName,
  );

  for (const [_bucketName, bucketEntries] of Object.entries(
    entriesPerBuckets,
  )) {
    if (!bucketEntries || bucketEntries.length === 0) {
      continue;
    }

    const { archiveUrl } = parseRemoteUnitUrl(bucketEntries[0].remoteUrl);
    const tempDirPath = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "wus-remote-cache-"),
    );

    try {
      const archivePath = path.join(tempDirPath, "archive.zip");
      const extractDirPath = path.join(tempDirPath, "extract");
      console.log(`fetching remote units archive: ${archiveUrl}`);
      const archiveResponse = await fetch(archiveUrl);
      if (!archiveResponse.ok) {
        const fallbackArchiveUrl = archiveUrl.replace(
          "/refs/tags/",
          "/refs/heads/",
        );
        const fallbackArchiveResponse = await fetch(fallbackArchiveUrl);
        if (!fallbackArchiveResponse.ok) {
          throw new Error(
            `Failed to download remote unit archive: ${archiveUrl} (${archiveResponse.status}), ${fallbackArchiveUrl} (${fallbackArchiveResponse.status})`,
          );
        }
        await fs.promises.writeFile(
          archivePath,
          Buffer.from(await fallbackArchiveResponse.arrayBuffer()),
        );
      } else {
        await fs.promises.writeFile(
          archivePath,
          Buffer.from(await archiveResponse.arrayBuffer()),
        );
      }

      await fs.promises.mkdir(extractDirPath, { recursive: true });
      await execFileAsync("unzip", ["-q", archivePath, "-d", extractDirPath]);

      const extractedRootDirEntry = (
        await fs.promises.readdir(extractDirPath, { withFileTypes: true })
      ).find((entry) => entry.isDirectory());
      if (!extractedRootDirEntry) {
        throw new Error(`Archive extraction produced no files: ${archiveUrl}`);
      }

      const extractedRootPath = path.join(
        extractDirPath,
        extractedRootDirEntry.name,
      );
      for (const entry of bucketEntries) {
        const { pieceFolderPath } = parseRemoteUnitUrl(entry.remoteUrl);
        const sourceUnitFolderPath = path.join(
          extractedRootPath,
          pieceFolderPath,
        );
        await writeCachedPiece(
          entry.bucketName,
          entry.pieceName,
          sourceUnitFolderPath,
        );
      }
    } finally {
      await fs.promises.rm(tempDirPath, { recursive: true, force: true });
      console.log(`units cache saved in ${cacheFolderPath}`);
    }
  }
}

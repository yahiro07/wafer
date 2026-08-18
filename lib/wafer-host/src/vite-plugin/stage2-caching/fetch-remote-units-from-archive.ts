import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import extract from "extract-zip";
import { CachedUnitEntry } from "../common/internal-types";
import { copyCachedPiece } from "./copy-cached-pieces";

async function downloadArchive(
  archiveUrl: string,
  archivePath: string,
): Promise<void> {
  const archiveResponse = await fetch(archiveUrl);
  if (archiveResponse.ok) {
    await fs.promises.writeFile(
      archivePath,
      Buffer.from(await archiveResponse.arrayBuffer()),
    );
    return;
  }

  const fallbackArchiveUrl = archiveUrl.replace("/refs/tags/", "/refs/heads/");
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
}

export async function fetchRemoteUnitsFromArchive(
  entries: CachedUnitEntry[],
): Promise<void> {
  const entriesPerRef = Object.groupBy(
    entries,
    (entry) => `${entry.source.owner}/${entry.source.repo}/${entry.source.ref}`,
  );

  for (const [_refKey, refEntries] of Object.entries(entriesPerRef)) {
    if (!refEntries || refEntries.length === 0) {
      continue;
    }

    const { archiveUrl } = refEntries[0].source;
    const tempDirPath = await fs.promises.mkdtemp(
      path.join(os.tmpdir(), "wus-remote-cache-"),
    );

    try {
      const archivePath = path.join(tempDirPath, "archive.zip");
      const extractDirPath = path.join(tempDirPath, "extract");
      console.log(`fetching remote units archive: ${archiveUrl}`);
      await downloadArchive(archiveUrl, archivePath);

      await fs.promises.mkdir(extractDirPath, { recursive: true });
      await extract(archivePath, { dir: extractDirPath });

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
      for (const entry of refEntries) {
        const sourceUnitFolderPath = path.join(
          extractedRootPath,
          entry.source.piecePath,
        );
        await copyCachedPiece(sourceUnitFolderPath, entry.folderPath);
      }
    } finally {
      await fs.promises.rm(tempDirPath, { recursive: true, force: true });
    }
  }
}

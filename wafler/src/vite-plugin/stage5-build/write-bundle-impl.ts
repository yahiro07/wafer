import fs from "node:fs";
import path from "node:path";
import { ResolvedUnitEntry } from "../common/internal-types";

export async function writeBundleImpl(
  resolvedUnitEntries: ResolvedUnitEntry[],
  configRoot: string,
  outDir: string,
) {
  for (const resolvedUnitEntry of resolvedUnitEntries) {
    if (resolvedUnitEntry.kind === "public") {
      //vite copies public to dist as-is, so we don't need to handle it here.
      continue;
    }
    if (resolvedUnitEntry.kind === "direct") {
      //skip direct referenced units (used in development) so far
      continue;
    }
    const outputFolderPath = path.resolve(
      configRoot,
      outDir,
      "inventory-units",
      resolvedUnitEntry.catalogKey,
    );
    await fs.promises.mkdir(outputFolderPath, { recursive: true });
    await fs.promises.cp(resolvedUnitEntry.folderPath, outputFolderPath, {
      recursive: true,
    });
  }
}

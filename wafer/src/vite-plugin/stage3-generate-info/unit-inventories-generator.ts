import fs from "node:fs";
import path from "node:path";
import { UnitMetadata } from "../../unit-types";
import { ResolvedUnitEntry } from "../common/internal-types";
import { UnitInventoriesJson, UnitInventorySpec } from "../common/types";
import { FrameSize, normalizeFrameSize } from "./frame-size";

async function fetchUnitAssetText(
  resolvedUnitEntry: ResolvedUnitEntry,
  targetAssetPath: string,
): Promise<string> {
  if (
    resolvedUnitEntry.kind === "file" ||
    resolvedUnitEntry.kind === "cache" ||
    resolvedUnitEntry.kind === "public"
  ) {
    const fullPath = path.join(resolvedUnitEntry.folderPath, targetAssetPath);
    // console.log(`Reading file from ${fullPath}`);
    try {
      return await fs.promises.readFile(fullPath, "utf8");
    } catch (_) {
      throw new Error(`Failed to read file from ${fullPath}`);
    }
  } else if (resolvedUnitEntry.kind === "direct") {
    const urlBase = resolvedUnitEntry.targetUrl;
    const url = new URL(targetAssetPath, urlBase);
    console.log(`Fetching file from ${url}`);
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to fetch from ${url}`);
      }
      return await res.text();
    } catch (_) {
      throw new Error(`Failed to fetch from ${url}`);
    }
  }
  throw new Error(`invalid condition`);
}

async function checkUnitAssetExists(
  resolvedUnitEntry: ResolvedUnitEntry,
  targetAssetPath: string,
): Promise<boolean> {
  if (
    resolvedUnitEntry.kind === "file" ||
    resolvedUnitEntry.kind === "cache" ||
    resolvedUnitEntry.kind === "public"
  ) {
    const fullPath = path.join(resolvedUnitEntry.folderPath, targetAssetPath);
    try {
      const stat = await fs.promises.stat(fullPath);
      return stat.isFile();
    } catch (_) {
      return false;
    }
  } else if (resolvedUnitEntry.kind === "direct") {
    const urlBase = resolvedUnitEntry.targetUrl;
    const url = new URL(targetAssetPath, urlBase);
    try {
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    } catch (_) {
      return false;
    }
  }
  throw new Error(`invalid condition`);
}

async function fetchUnitMeta(
  resolvedUnitEntry: ResolvedUnitEntry,
): Promise<UnitMetadata> {
  const text = await fetchUnitAssetText(resolvedUnitEntry, "unit-meta.json");
  try {
    return JSON.parse(text);
  } catch (_) {
    throw new Error(`Failed to parse unit-meta.json: ${text}`);
  }
}

function getLoaderPageUrlBase(resolvedUnitEntry: ResolvedUnitEntry): string {
  if (resolvedUnitEntry.kind === "public") {
    return `${resolvedUnitEntry.sourceUrlSpec}`;
  } else if (resolvedUnitEntry.kind === "direct") {
    return `${resolvedUnitEntry.targetUrl}`;
  } else {
    return `/inventory-units/${resolvedUnitEntry.catalogKey}/`;
  }
}

//for unit-thumbnail.png and LICENSE text file
function getUrlBaseForAssets(resolvedUnitEntry: ResolvedUnitEntry): string {
  if (resolvedUnitEntry.kind === "file") {
    return `/inventory-units/${resolvedUnitEntry.catalogKey}/`;
  } else {
    return resolvedUnitEntry.sourceUrlSpec;
  }
}

function createUnitInventorySpec(
  resolvedUnitEntry: ResolvedUnitEntry,
  meta: UnitMetadata,
  preferredSize: FrameSize,
  isModuleLibraryUnit: boolean,
  hasThumbnail: boolean,
  hasLicenseText: boolean,
): UnitInventorySpec {
  const catalogKey = resolvedUnitEntry.catalogKey;
  const pageFolderUrl = resolvedUnitEntry.sourceUrlSpec;

  const _meta = meta as any;
  const loaderPageUrlBase = getLoaderPageUrlBase(resolvedUnitEntry);
  const urlBaseForAssets = getUrlBaseForAssets(resolvedUnitEntry);
  const entryFileName = isModuleLibraryUnit ? "index.js" : "index.html";
  return {
    catalogKey,
    name: meta.name,
    unitType: meta.unitType,
    category: meta.categoryHint,
    preferredSize,
    outputSignalTypes: meta.outputSignalTypes,
    inputSignalTypes: meta.inputSignalTypes,
    unitTypesVersion: meta.unitTypesVersion,
    originalPageUrl: `${pageFolderUrl}${entryFileName}`,
    loaderPageUrl: `${loaderPageUrlBase}${entryFileName}`,
    thumbnailUrl: hasThumbnail
      ? `${urlBaseForAssets}unit-thumbnail.png`
      : undefined,
    //
    originalRepositoryUrl: _meta.repositoryUrl ?? _meta.originalRepositoryUrl,
    originalAuthor: _meta.author ?? _meta.originalAuthor,
    forkedRepositoryUrl: _meta.forkedRepositoryUrl,
    forkedAuthor: _meta.forkedAuthor,
    license: meta.license,
    licenseTextUrl: hasLicenseText ? `${urlBaseForAssets}LICENSE` : undefined,
  };
}

export async function generateSummariesJson(
  resolvedUnitEntries: ResolvedUnitEntry[],
): Promise<UnitInventoriesJson> {
  const inventorySpecs = await Promise.all(
    resolvedUnitEntries.map(async (resolvedUnitEntry) => {
      const meta = await fetchUnitMeta(resolvedUnitEntry);
      const hasThumbnail = await checkUnitAssetExists(
        resolvedUnitEntry,
        "unit-thumbnail.png",
      );
      const hasLicenseText = await checkUnitAssetExists(
        resolvedUnitEntry,
        "LICENSE",
      );
      const preferredSize = normalizeFrameSize(meta.preferredSize);
      if (!preferredSize) {
        console.log(meta);
        throw new Error(
          `Invalid preferred size for unit ${resolvedUnitEntry.catalogKey}`,
        );
      }
      const hasIndexHtml = await checkUnitAssetExists(
        resolvedUnitEntry,
        "index.html",
      );
      const hasIndexJs = await checkUnitAssetExists(
        resolvedUnitEntry,
        "index.js",
      );
      if (!(hasIndexHtml || hasIndexJs)) {
        throw new Error(
          `both index.html and index.js are missing for unit ${resolvedUnitEntry.catalogKey}`,
        );
      }
      const isModuleLibraryUnit = !hasIndexHtml && hasIndexJs;

      return createUnitInventorySpec(
        resolvedUnitEntry,
        meta,
        preferredSize,
        isModuleLibraryUnit,
        hasThumbnail,
        hasLicenseText,
      );
    }),
  );
  const summariesJson: UnitInventoriesJson = Object.fromEntries(
    inventorySpecs.map((spec) => [spec.catalogKey, spec]),
  );
  return summariesJson;
}

export async function readSummariesJsonFromFile(
  filePath: string,
): Promise<UnitInventoriesJson | undefined> {
  try {
    const content = await fs.promises.readFile(filePath, "utf8");
    const json = JSON.parse(content) as UnitInventoriesJson;
    return json;
  } catch (error) {
    if ((error as any).code === "ENOENT") {
      return undefined;
    }
    throw new Error(
      `Failed to read summaries JSON from file ${filePath}: ${error}`,
    );
  }
}

export async function writeSummariesJsonToFile(
  summariesJson: UnitInventoriesJson,
  outputPath: string,
) {
  const outputContent = `${JSON.stringify(summariesJson, null, 2)}\n`;
  await fs.promises.writeFile(outputPath, outputContent);
  console.log(`generated ${outputPath}`);
}

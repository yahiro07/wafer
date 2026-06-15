import path from "node:path";
import { normalizeCasing } from "../common/common-helper";
import { ResolvedUnitEntry } from "../common/internal-types";
import {
  extractDirectTargetUrl,
  mapUnitUrlToBucketAndPieceNames,
} from "../common/unit-url-helpers";

function mapUrlToResolvedUnitEntry(
  catalogKeyInput: string,
  url: string,
  unitsCacheFolderPath: string,
): ResolvedUnitEntry {
  const catalogKey = normalizeCasing(catalogKeyInput, "camel");
  const sourceUrlSpec = url;
  if (url.startsWith("/@direct/")) {
    const targetUrl = extractDirectTargetUrl(url);
    return { catalogKey, sourceUrlSpec, kind: "direct", targetUrl };
  } else if (url.startsWith("https://") || url.startsWith("http://")) {
    const { bucketName, pieceName } = mapUnitUrlToBucketAndPieceNames(url);
    const folderPath = path.join(unitsCacheFolderPath, bucketName, pieceName);
    return {
      catalogKey,
      sourceUrlSpec,
      kind: "cache",
      folderPath,
      bucketName,
      pieceName,
    };
  } else if (url.startsWith("file:///")) {
    const folderPath = url.replace("file:///", "/");
    return { catalogKey, sourceUrlSpec, kind: "file", folderPath };
  } else if (url.startsWith("/")) {
    const folderPath = `./public${url}`;
    return { catalogKey, sourceUrlSpec, kind: "public", folderPath };
  } else {
    throw new Error(`Unsupported URL format for unit source: ${url}`);
  }
}

export function createResolvedUnitEntries(
  sourceUrls: Record<string, string>,
  unitsCacheFolderPath: string,
): ResolvedUnitEntry[] {
  return Object.entries(sourceUrls).map(([catalogKey, url]) =>
    mapUrlToResolvedUnitEntry(catalogKey, url, unitsCacheFolderPath),
  );
}

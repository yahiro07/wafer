import {
  UnitSourceUrls,
  UnitSourceUrlsArray,
  UnitSourceUrlsInput,
} from "../common/types";
import { createSegmentsDecoder } from "../common/unit-url-helpers";

function getCatalogKeyFromUrl(url: string) {
  const segDecoder = createSegmentsDecoder(url, {
    removeHeadSlash: true,
  });
  if (url.startsWith("/@direct/")) {
    return segDecoder.getSegmentAt(1);
  } else {
    return segDecoder.getSegmentAt(-1);
  }
}

function createUnitSourceUrlsDictionaryFromArray(
  unitSourceUrlsArray: UnitSourceUrlsArray,
): UnitSourceUrls {
  const items = unitSourceUrlsArray
    .map((item) => {
      const [url, catalogKey] = (() => {
        if (typeof item === "string") {
          const url = item;
          return [url, getCatalogKeyFromUrl(url)];
        } else {
          const url = item.url;
          const catalogKey = item.key ?? getCatalogKeyFromUrl(url);
          return [url, catalogKey];
        }
      })();
      if (catalogKey) {
        return { catalogKey, url } as const;
      }
      return undefined;
    })
    .filter((it) => !!it) as { catalogKey: string; url: string }[];
  const nameCounters: Record<string, number> = {};
  for (const item of items) {
    const key = item.catalogKey;
    nameCounters[key] ??= 0;
    nameCounters[key]++;
    if (nameCounters[key] > 1) {
      item.catalogKey = `${key}-${nameCounters[key]}`;
    }
  }
  return Object.fromEntries(
    items.map(({ catalogKey, url }) => [catalogKey, url]),
  );
}

export function formatUnitSourceUrlsToDictionary(
  unitSourceUrls: UnitSourceUrlsInput,
): UnitSourceUrls {
  if (Array.isArray(unitSourceUrls)) {
    return createUnitSourceUrlsDictionaryFromArray(unitSourceUrls);
  } else {
    return unitSourceUrls;
  }
}

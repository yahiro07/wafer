import fs from "node:fs";
import path from "node:path";
import type { Connect } from "vite";
import { getContentType } from "../common/common-helper";
import { ResolvedUnitEntry } from "../common/internal-types";

export function createDevServerMiddleware(
  resolvedUnitEntries: ResolvedUnitEntry[],
): Connect.NextHandleFunction {
  const resolvedUnitEntriesMap = Object.fromEntries(
    resolvedUnitEntries.map((entry) => [entry.catalogKey, entry]),
  );
  return async (req, res, next) => {
    console.log("requested", req.url);
    if (!req.url) {
      next();
      return;
    }

    const requestUrl = new URL(req.url, "http://localhost");
    const requestPath = requestUrl.pathname;

    if (requestPath.startsWith("/inventory-units/")) {
      const segments = requestPath.replace("/inventory-units/", "").split("/");
      const catalogKey = segments[0];
      const pathInUnit = segments.slice(1).join("/");

      const resolvedUnitEntry = resolvedUnitEntriesMap[catalogKey];
      if (resolvedUnitEntry && pathInUnit) {
        if (
          resolvedUnitEntry.kind === "cache" ||
          resolvedUnitEntry.kind === "file"
        ) {
          const targetFilePath = path.join(
            resolvedUnitEntry.folderPath,
            pathInUnit,
          );
          console.log(
            "--> resolved by unit loader:",
            req.url,
            "-->",
            targetFilePath,
          );
          res.statusCode = 200;
          res.setHeader("Content-Type", getContentType(targetFilePath));
          fs.createReadStream(targetFilePath).pipe(res);
          return;
        }
      }
    }
    next();
  };
}

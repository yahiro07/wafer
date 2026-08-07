import fs from "node:fs";
import { ViteDevServer } from "vite";
import { ResolvedUnitEntry } from "../common/internal-types";

export function startWatchEntryFiles(
  server: ViteDevServer,
  inputEntries: ResolvedUnitEntry[],
) {
  type WatchTarget = { catalogKey: string; filePath: string };

  const watchTargets = inputEntries
    .map((item) => {
      if (item.kind === "file") {
        const indexHtmlPath = item.folderPath + "index.html";
        const indexJsPath = item.folderPath + "index.js";
        const indexSharableJsPath = item.folderPath + "index.sharable.js";
        const hasIndexHtml = fs.existsSync(indexHtmlPath);
        const hasIndexJs = fs.existsSync(indexJsPath);
        const hasIndexSharableJs = fs.existsSync(indexSharableJsPath);
        if (!hasIndexHtml && hasIndexJs) {
          return { catalogKey: item.catalogKey, filePath: indexJsPath };
        } else if (!hasIndexHtml && hasIndexSharableJs) {
          return { catalogKey: item.catalogKey, filePath: indexSharableJsPath };
        } else if (hasIndexHtml) {
          return { catalogKey: item.catalogKey, filePath: indexHtmlPath };
        }
      }
      return undefined;
    })
    .filter(Boolean) as WatchTarget[];

  for (const item of watchTargets) {
    console.log(`watch ${item.filePath}`);
    server.watcher.add(item.filePath);
  }
  server.watcher.on("change", (filePath) => {
    const item = watchTargets.find((it) => it.filePath === filePath);
    if (item) {
      console.log(`file changed: ${item.catalogKey}`);
      server.ws.send("custom:unit-source-changed", {
        catalogKey: item.catalogKey,
        timestamp: Date.now(),
      });
    }
  });
}

import fs from "node:fs";
import path from "node:path";

export function checkDeepEquality(obj1: any, obj2: any): boolean {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export function normalizeCasing(
  key: string,
  format: "camel" | "snake" | "kebab",
) {
  switch (format) {
    case "camel":
      return key
        .split(/[-_]+/)
        .map((part, index) =>
          index === 0
            ? part.toLowerCase()
            : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
        )
        .join("");
    case "snake":
      return key
        .split(/[-_]+/)
        .map((part) => part.toLowerCase())
        .join("_");
    case "kebab":
      return key
        .split(/[-_]+/)
        .map((part) => part.toLowerCase())
        .join("-");
    default:
      throw new Error(`Unsupported catalog key format: ${format}`);
  }
}

export function getContentType(filePath: string): string {
  if (filePath.endsWith("LICENSE")) {
    return "text/plain; charset=utf-8";
  }
  switch (path.extname(filePath).toLowerCase()) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".svg":
      return "image/svg+xml";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".wasm":
      return "application/wasm";
    case ".map":
      return "application/json; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}

export async function checkFileExists(filePath: string): Promise<boolean> {
  return fs.promises
    .stat(filePath)
    .then(() => true)
    .catch(() => false);
}

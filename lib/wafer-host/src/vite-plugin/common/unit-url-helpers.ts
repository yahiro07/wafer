import path from "node:path";
import { GitHubUnitSource } from "./internal-types";

export function parseRemoteUnitUrl(url: string): GitHubUnitSource {
  const parsedUrl = new URL(url);
  parsedUrl.search = "";
  parsedUrl.hash = "";

  if (parsedUrl.hostname !== "github.com") {
    throw new Error(`Unsupported remote unit host: ${url}`);
  }

  const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
  if (pathSegments.length < 4 || pathSegments[2] !== "tree") {
    throw new Error(`Unsupported remote unit path format: ${url}`);
  }

  const [owner, repo, _tree, ref, ...piecePathSegments] = pathSegments;
  if (!owner || !repo || !ref) {
    throw new Error(
      `Remote unit URL must contain owner, repo, and ref: ${url}`,
    );
  }

  const piecePath = piecePathSegments.join("/");
  return {
    owner,
    repo,
    ref,
    piecePath,
    cloneUrl: `https://github.com/${owner}/${repo}.git`,
    archiveUrl: `https://github.com/${owner}/${repo}/archive/refs/tags/${ref}.zip`,
  };
}

export function getCachedUnitRelativePath(source: GitHubUnitSource): string {
  const pieceName =
    source.piecePath.split("/").filter(Boolean).at(-1) ?? source.repo;
  return path.join(`${source.owner}_${source.repo}_${source.ref}`, pieceName);
}

export function getRepositoryRelativePath(source: GitHubUnitSource): string {
  return `${source.owner}_${source.repo}`;
}

export function toOriginalPageUrl(
  sourceUrlSpec: string,
  entryFileName: string,
): string {
  return `${sourceUrlSpec.replace("/tree/", "/blob/")}${entryFileName}`;
}

export function checkUnitSourceUrlFormat(url: string) {
  const heads = ["http://", "https://", "file://", "/@direct/", "/"];
  if (!heads.some((head) => url.startsWith(head))) {
    throw new Error(`Unsupported URL format for unit source: ${url}`);
  }
  if (!url.endsWith("/")) {
    throw new Error(`Unit source URL should end with '/': ${url}`);
  }
}

export function createSegmentsDecoder(
  pathValue: string,
  options?: { removeHeadSlash?: boolean; removeTailSlash?: boolean },
) {
  let normalizedPath = pathValue;
  if (options?.removeHeadSlash) {
    normalizedPath = normalizedPath.replace(/^\/+/, "");
  }
  if (options?.removeTailSlash) {
    normalizedPath = normalizedPath.replace(/\/+$/, "");
  }
  const segments = normalizedPath.split("/").filter(Boolean);

  return {
    getSegmentAt(index: number): string | undefined {
      return segments.at(index);
    },
    getJoinedPathFrom(index: number): string {
      const startIndex =
        index >= 0 ? index : Math.max(segments.length + index, 0);
      return segments.slice(startIndex).join("/");
    },
  };
}

export function extractDirectTargetUrl(url: string) {
  // /@direct/debugLH3000/http://localhost:3000/ --> http://localhost:3000/

  const prefix = "/@direct/";
  if (!url.startsWith(prefix)) {
    throw new Error(`Direct unit URL must start with '${prefix}': ${url}`);
  }

  const body = url.slice(prefix.length);
  const firstSlashIndex = body.indexOf("/");
  if (firstSlashIndex < 0) {
    throw new Error(
      `Direct unit URL must include catalogKey and target URL: ${url}`,
    );
  }

  const catalogKey = body.slice(0, firstSlashIndex);
  const targetUrl = body.slice(firstSlashIndex + 1);
  if (!catalogKey) {
    throw new Error(`Direct unit URL must include a catalogKey: ${url}`);
  }
  if (!targetUrl) {
    throw new Error(`Direct unit URL must include a target URL: ${url}`);
  }
  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    throw new Error(
      `Direct target URL must start with http:// or https://: ${url}`,
    );
  }
  return targetUrl;
}

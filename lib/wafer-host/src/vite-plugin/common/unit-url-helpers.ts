export function parseRemoteUnitUrl(url: string): {
  bucketName: string;
  pieceName: string;
  pieceFolderPath: string;
  archiveUrl: string;
} {
  const parsedUrl = new URL(url);
  if (parsedUrl.hostname !== "cdn.jsdelivr.net") {
    throw new Error(`Unsupported remote unit host: ${url}`);
  }

  const pathSegments = parsedUrl.pathname.split("/").filter(Boolean);
  if (pathSegments[0] !== "gh") {
    throw new Error(`Unsupported remote unit path format: ${url}`);
  }

  const bucketLastSegmentIndex = pathSegments.findIndex((segment) =>
    segment.includes("@"),
  );
  if (bucketLastSegmentIndex < 0) {
    throw new Error(`Remote unit URL must contain a tag segment: ${url}`);
  }

  const bucketSegments = pathSegments
    .slice(0, bucketLastSegmentIndex + 1)
    .flatMap((segment) => segment.split("@"));
  const [_, owner, repoWithTag] = pathSegments;
  const [repo, ref] = repoWithTag.split("@");
  if (!owner || !repo || !ref) {
    throw new Error(
      `Remote unit URL must contain owner, repo, and ref: ${url}`,
    );
  }

  const piecePathSegments = pathSegments.slice(bucketLastSegmentIndex + 1);
  const isLastSegmentFile = piecePathSegments.at(-1)?.includes(".") ?? false;
  const pieceFolderSegments = isLastSegmentFile
    ? piecePathSegments.slice(0, -1)
    : piecePathSegments;
  const pieceName = pieceFolderSegments.at(-1);

  if (!pieceName) {
    throw new Error(`Remote unit URL must contain a piece name: ${url}`);
  }

  const pieceFolderPath = pieceFolderSegments.join("/");
  if (!pieceFolderPath) {
    throw new Error(`Remote unit URL must contain a piece folder path: ${url}`);
  }

  return {
    bucketName: bucketSegments.join("_"),
    pieceName,
    pieceFolderPath,
    archiveUrl: `https://github.com/${owner}/${repo}/archive/refs/tags/${ref}.zip`,
  };
}

export function mapUnitUrlToBucketAndPieceNames(url: string): {
  bucketName: string;
  pieceName: string;
} {
  const { bucketName, pieceName } = parseRemoteUnitUrl(url);
  return { bucketName, pieceName };
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
  path: string,
  options?: { removeHeadSlash?: boolean; removeTailSlash?: boolean },
) {
  let normalizedPath = path;
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

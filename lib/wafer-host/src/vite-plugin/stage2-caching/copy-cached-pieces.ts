import fs from "node:fs";
import path from "node:path";

export async function copyCachedPiece(
  sourceDir: string,
  destDir: string,
  options?: { excludeGit?: boolean },
): Promise<void> {
  await fs.promises.mkdir(path.dirname(destDir), { recursive: true });
  await fs.promises.rm(destDir, { recursive: true, force: true });
  await fs.promises.cp(sourceDir, destDir, {
    recursive: true,
    filter: (srcPath) => {
      if (!options?.excludeGit) {
        return true;
      }
      const relativePath = path.relative(sourceDir, srcPath);
      if (!relativePath || relativePath === "") {
        return true;
      }
      const [firstSegment] = relativePath.split(path.sep);
      return firstSegment !== ".git";
    },
  });
}

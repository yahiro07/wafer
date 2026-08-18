import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CachedUnitEntry, GitHubUnitSource } from "../common/internal-types";
import { getRepositoryRelativePath } from "../common/unit-url-helpers";
import { copyCachedPiece } from "./copy-cached-pieces";

const lockWaitTimeoutMs = 5 * 60 * 1000;
const lockRetryMs = 150;

function runGit(
  args: string[],
  cwd?: string,
  options?: { quiet?: boolean },
): Promise<string> {
  const quiet = options?.quiet ?? false;
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, {
      cwd,
      env: process.env,
      stdio: quiet
        ? ["ignore", "pipe", "pipe"]
        : ["ignore", "inherit", "inherit"],
    });
    let stdout = "";
    let stderr = "";
    if (quiet) {
      child.stdout?.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr?.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }
      reject(
        new Error(
          `git ${args.join(" ")} failed (${code})${stderr ? `: ${stderr.trim()}` : ""}`,
        ),
      );
    });
  });
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.promises.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function withRepoLock<T>(
  repoDir: string,
  run: () => Promise<T>,
): Promise<T> {
  const lockPath = `${repoDir}.lock`;
  await fs.promises.mkdir(path.dirname(repoDir), { recursive: true });
  const startedAt = Date.now();

  while (true) {
    try {
      await fs.promises.writeFile(lockPath, String(process.pid), {
        flag: "wx",
      });
      break;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
        throw error;
      }
      if (Date.now() - startedAt > lockWaitTimeoutMs) {
        throw new Error(
          `Timed out waiting for git repository lock: ${repoDir}`,
        );
      }
      try {
        const ownerPid = Number(
          (await fs.promises.readFile(lockPath, "utf8")).trim(),
        );
        if (!Number.isNaN(ownerPid) && !isPidRunning(ownerPid)) {
          await fs.promises.rm(lockPath, { force: true });
          continue;
        }
      } catch {
        // lock file may have been released
      }
      await new Promise((resolve) => setTimeout(resolve, lockRetryMs));
    }
  }

  try {
    return await run();
  } finally {
    await fs.promises.rm(lockPath, { force: true });
  }
}

async function hasLocalCommit(repoDir: string, ref: string): Promise<boolean> {
  try {
    await runGit(["rev-parse", "--verify", `${ref}^{commit}`], repoDir, {
      quiet: true,
    });
    return true;
  } catch {
    return false;
  }
}

async function ensureRepository(
  repoDir: string,
  source: GitHubUnitSource,
): Promise<void> {
  const gitDirPath = path.join(repoDir, ".git");
  if (await pathExists(gitDirPath)) {
    return;
  }

  await fs.promises.mkdir(path.dirname(repoDir), { recursive: true });
  console.log(`git clone ${source.cloneUrl}`);
  await runGit([
    "clone",
    "-c",
    "core.autocrlf=false",
    "--no-tags",
    "--progress",
    source.cloneUrl,
    repoDir,
  ]);
}

async function fetchAndCheckoutRef(
  repoDir: string,
  ref: string,
): Promise<void> {
  if (!(await hasLocalCommit(repoDir, ref))) {
    try {
      console.log(`git fetch origin refs/tags/${ref}`);
      await runGit(
        [
          "fetch",
          "--no-tags",
          "--progress",
          "origin",
          `refs/tags/${ref}:refs/tags/${ref}`,
        ],
        repoDir,
      );
    } catch (tagError) {
      console.log(`git fetch origin refs/heads/${ref}`);
      try {
        await runGit(
          [
            "fetch",
            "--no-tags",
            "--progress",
            "origin",
            `refs/heads/${ref}:refs/heads/${ref}`,
          ],
          repoDir,
        );
      } catch (branchError) {
        throw new Error(
          `Failed to fetch git ref '${ref}': ${String(tagError)}; ${String(branchError)}`,
        );
      }
    }
  }

  try {
    await runGit(
      ["-c", "advice.detachedHead=false", "checkout", "--force", ref],
      repoDir,
    );
  } catch {
    await runGit(
      ["-c", "advice.detachedHead=false", "checkout", "--force", "FETCH_HEAD"],
      repoDir,
    );
  }
}

export async function fetchRemoteUnitsFromGit(
  entries: CachedUnitEntry[],
  cacheRoot: string,
): Promise<void> {
  const entriesPerRepo = Object.groupBy(
    entries,
    (entry) => `${entry.source.owner}/${entry.source.repo}`,
  );

  for (const [_repoKey, repoEntries] of Object.entries(entriesPerRepo)) {
    if (!repoEntries || repoEntries.length === 0) {
      continue;
    }

    const source = repoEntries[0].source;
    const repoDir = path.join(
      cacheRoot,
      "repositories",
      getRepositoryRelativePath(source),
    );

    await withRepoLock(repoDir, async () => {
      await ensureRepository(repoDir, source);

      const entriesPerRef = Object.groupBy(
        repoEntries,
        (entry) => entry.source.ref,
      );
      for (const [ref, refEntries] of Object.entries(entriesPerRef)) {
        if (!refEntries || refEntries.length === 0) {
          continue;
        }
        await fetchAndCheckoutRef(repoDir, ref);
        for (const entry of refEntries) {
          const sourceUnitFolderPath = path.join(
            repoDir,
            entry.source.piecePath,
          );
          await copyCachedPiece(sourceUnitFolderPath, entry.folderPath, {
            excludeGit: entry.source.piecePath === "",
          });
        }
      }
    });
  }
}

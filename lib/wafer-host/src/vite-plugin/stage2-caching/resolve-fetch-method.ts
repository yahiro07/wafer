import { spawn } from "node:child_process";
import type { UnitFetchMethod } from "../common/types";

export type ResolvedFetchMethod = "git" | "archive";

async function isGitAvailable(): Promise<boolean> {
  return await new Promise((resolve) => {
    const child = spawn("git", ["--version"], {
      stdio: ["ignore", "ignore", "ignore"],
    });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

export async function resolveFetchMethod(
  fetchMethod: UnitFetchMethod,
): Promise<ResolvedFetchMethod> {
  if (fetchMethod === "zip") {
    return "archive";
  }

  const gitAvailable = await isGitAvailable();
  if (fetchMethod === "git") {
    if (!gitAvailable) {
      throw new Error(
        "fetchMethod is 'git' but the git command is not available in PATH",
      );
    }
    return "git";
  }

  return gitAvailable ? "git" : "archive";
}

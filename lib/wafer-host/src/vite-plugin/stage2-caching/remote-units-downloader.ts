import { CachedUnitEntry } from "../common/internal-types";
import { UnitFetchMethod } from "../common/types";
import { fetchRemoteUnitsFromArchive } from "./fetch-remote-units-from-archive";
import { fetchRemoteUnitsFromGit } from "./fetch-remote-units-from-git";
import { resolveFetchMethod } from "./resolve-fetch-method";

export async function downloadUnitsFromRemote(options: {
  entries: CachedUnitEntry[];
  cacheRoot: string;
  fetchMethod: UnitFetchMethod;
}): Promise<void> {
  const { entries, cacheRoot, fetchMethod } = options;
  if (entries.length === 0) {
    return;
  }

  console.log(`adding ${entries.length} remote unit(s) to local cache...`);
  const resolvedFetchMethod = await resolveFetchMethod(fetchMethod);
  if (resolvedFetchMethod === "git") {
    await fetchRemoteUnitsFromGit(entries, cacheRoot);
  } else {
    await fetchRemoteUnitsFromArchive(entries);
  }
  console.log(`units cache saved in ${cacheRoot}`);
}

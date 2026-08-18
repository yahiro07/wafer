/*
cache: original source is online (https://) and the content is downloaded to local cache folder at build time 
cache: it is proxied in dev server and served as static asset in production 

file: original source is at the arbitrary local path
file: it is proxied in dev server and served as static asset in production

public: source contents are in 'public' folder in project root, pass through as is
  
direct: non-proxied http(s) access. used for local server such like http://localhost:3000
*/

export type GitHubUnitSource = {
  owner: string;
  repo: string;
  ref: string;
  piecePath: string;
  cloneUrl: string;
  archiveUrl: string;
};

export type ResolvedUnitEntry = {
  catalogKey: string;
  publicFolderName: string;
  sourceUrlSpec: string;
} & (
  | { kind: "cache"; folderPath: string; source: GitHubUnitSource }
  | { kind: "file" | "public"; folderPath: string }
  | { kind: "direct"; targetUrl: string }
);

export type ResolvedUnitEntriesMap = Record<string, ResolvedUnitEntry>;

export type CachedUnitEntry = {
  sourceUrlSpec: string;
  folderPath: string;
  source: GitHubUnitSource;
};

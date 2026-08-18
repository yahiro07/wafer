import { UnitCategoryHint, UnitType } from "../../unit-types";

export type UnitSourceUrls = Record<string, string>;

export type UnitSourceUrlRecord = {
  url: string;
  key?: string;
};

export type UnitSourceUrlsArray = (string | UnitSourceUrlRecord)[];

export type UnitSourceUrlsInput = UnitSourceUrls | UnitSourceUrlsArray;

export type UnitFetchMethod = "auto" | "git" | "zip";

export type UnitInventorySpec = {
  catalogKey: string;
  name: string;
  unitType: UnitType;
  category?: UnitCategoryHint;
  outputSignalTypes: string;
  inputSignalTypes: string;
  unitTypesVersion: string;
  originalPageUrl: string;
  loaderPageUrl: string;
  thumbnailUrl?: string;
  //
  originalRepositoryUrl: string;
  originalAuthor: string;
  forkedRepositoryUrl?: string;
  forkedAuthor?: string;
  license: string;
  licenseTextUrl?: string;
};

export type UnitInventoriesJson = Record<string, UnitInventorySpec>;

export type UnitEntryKind =
  | "iframe"
  | "customElement"
  | "customElementSharable";

import { UnitCategoryHint, UnitType } from "wus-unit-types";

export type UnitSourceUrls = Record<string, string>;

export type UnitSourceUrlRecord = {
  url: string;
  key?: string;
};

export type UnitSourceUrlsArray = (string | UnitSourceUrlRecord)[];

export type UnitSourceUrlsInput = UnitSourceUrls | UnitSourceUrlsArray;

export type UnitInventorySpec = {
  catalogKey: string;
  name: string;
  unitType: UnitType;
  category?: UnitCategoryHint;
  preferredSize: { width: number; height: number };
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

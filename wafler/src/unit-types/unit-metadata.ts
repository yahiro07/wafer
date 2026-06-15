import { UnitCategoryHint, UnitType } from "./unit-interfaces";

export type UnitMetadata = {
  name: string;
  unitType: UnitType;
  categoryHint?: UnitCategoryHint;
  preferredSize: string; //w,h
  outputSignalTypes: string; //audio,note
  inputSignalTypes: string; //audio,note
  protocol: "wafler-v01";
  unitTypesVersion: string;
  integrationFormat: "iframe" | "webComponents";
} & (
  | { repositoryUrl: string; author: string }
  | {
      originalRepositoryUrl: string;
      originalAuthor: string;
      forkedRepositoryUrl: string;
      forkedAuthor: string;
    }
) & {
    license: string;
  };

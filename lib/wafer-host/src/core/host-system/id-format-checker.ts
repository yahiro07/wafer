export function checkUnitIdValidity(unitId: string) {
  if (!unitId.match(/^[a-zA-Z0-9_-]+$/) || unitId === "$output") {
    return false;
  }
  return true;
}

const portIdsReserved = new Set<string>([
  "primaryOutput",
  "primaryInput",
  //
  "audioOutput",
  "noteOutput",
  "automationOutput",
  "clockOutput",
  //
  "audioInput",
  "noteInput",
  "automationInput",
  "clockInput",
]);

export function checkPortIdValidity(portId: string) {
  if (!portId.match(/^[a-zA-Z0-9_-]+$/) || portIdsReserved.has(portId)) {
    throw new Error(`Invalid port id: ${portId}`);
  }
}

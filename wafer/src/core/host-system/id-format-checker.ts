export function checkUnitIdValidity(unitId: string) {
  if (!unitId.match(/^[a-zA-Z0-9_-]+$/) || unitId === "$output") {
    throw new Error(`Invalid unit id: ${unitId}`);
  }
}

export function checkPortIdValidity(portId: string) {
  if (
    !portId.match(/^[a-zA-Z0-9_-]+$/) ||
    portId === "primaryOutput" ||
    portId === "primaryInput"
  ) {
    throw new Error(`Invalid port id: ${portId}`);
  }
}

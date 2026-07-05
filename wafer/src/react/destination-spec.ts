/*
//examples (string syntax)
destSpec="unit1"
destSpec="unit1.port1"
destSpec="unit1&unit2"
destSpec="port1:unit2"
desSpec="unit1&unit2|port1:unit3.port2&unit4"

//examples (object syntax)
destSpec={{ primaryOutput: "unit1" }}
destSpec={{ primaryOutput: "unit1.port1" }}
destSpec={{ primaryOutput: ["unit1", "unit2"] }}
destSpec={{ port1: "unit2" }}
destSpec={{ primaryOutput: ["unit1", "unit2"], port1:["unit3.port2", "unit4"] }}
*/
export type UnitDestinationSpec = string | Record<string, string | string[]>;

export function serializeUnitDestinationSpec(
  destSpec: UnitDestinationSpec | undefined,
): string | undefined {
  if (typeof destSpec === "string" || destSpec === undefined) {
    return destSpec;
  }
  return Object.entries(destSpec)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}:${value.join("&")}`;
      }
      return `${key}:${value}`;
    })
    .join("|");
}

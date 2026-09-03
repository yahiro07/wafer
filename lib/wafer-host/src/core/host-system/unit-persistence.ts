import { base64Helper, isUint8ArrayLike } from "../../utils/binary-helper";
import { HsUnitInstance, HsUnitStateData } from "../linkage/types";
import { HostStateBus } from "./types";
import { wrapUnitCall } from "./wrap-unit-call";

export const unitStateOperations = {
  readStateFromUnit(unit: HsUnitInstance): HsUnitStateData | undefined {
    const stateInput = unit.persistence;
    const state = wrapUnitCall(
      () => stateInput?.emitStateBytes?.() ?? stateInput?.emitState?.(),
    );
    if (!state) {
      return undefined;
    }
    if (isUint8ArrayLike(state)) {
      return {
        unitId: unit.unitId,
        type: "bytes",
        base64: base64Helper.encode(state),
      };
    } else {
      const stateCopied = structuredClone(state);
      return { unitId: unit.unitId, type: "json", json: stateCopied };
    }
  },
  applyStateToUnit(unit: HsUnitInstance, stateData: HsUnitStateData) {
    wrapUnitCall(() => {
      const stateInput = unit.persistence;
      if (stateData.type === "bytes" && stateInput?.applyStateBytes) {
        const bytes = base64Helper.decode(stateData.base64);
        console.log(`call applyStateBytes for ${unit.unitId}`);
        stateInput.applyStateBytes(bytes);
      } else if (stateData.type === "json" && stateInput?.applyState) {
        const data = structuredClone(stateData.json);
        console.log(`call applyState for ${unit.unitId}`);
        stateInput.applyState(data);
      } else {
        console.warn(`invalid condition applyStateToUnit for ${unit.unitId}`);
      }
    });
  },
};

export function createUnitPersistenceHandlers(bus: HostStateBus) {
  return {
    exportUnitStates(): HsUnitStateData[] {
      const units = bus.getAllUnits();
      return units
        .map(unitStateOperations.readStateFromUnit)
        .filter(Boolean) as HsUnitStateData[];
    },
    importUnitStates(unitStates: HsUnitStateData[]) {
      for (const state of unitStates) {
        const unit = bus.getUnit(state.unitId);
        if (unit) {
          unitStateOperations.applyStateToUnit(unit, state);
        }
      }
    },
  };
}

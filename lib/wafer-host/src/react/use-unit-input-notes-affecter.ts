import { useEffect, useRef } from "react";
import { HsUnitInstance } from "../core";
import { safeInvoke } from "../core/host-system/wrap-unit-call";

export function useUnitInputNotesAffecter(
  unitInstance: HsUnitInstance | null,
  inputNotes?: number[],
) {
  const activeNotesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (unitInstance) {
      const activeNotes = activeNotesRef.current;
      const notesToAdd =
        inputNotes?.filter((note) => !activeNotes.has(note)) || [];
      const notesToRemove = Array.from(activeNotes).filter(
        (note) => !inputNotes?.includes(note),
      );
      for (const note of notesToAdd) {
        safeInvoke(unitInstance.primaryInputPorts.noteInput?.noteOn)?.(note);
        activeNotes.add(note);
      }
      for (const note of notesToRemove) {
        safeInvoke(unitInstance.primaryInputPorts.noteInput?.noteOff)?.(note);
        activeNotes.delete(note);
      }
    }
  }, [inputNotes, unitInstance]);
}

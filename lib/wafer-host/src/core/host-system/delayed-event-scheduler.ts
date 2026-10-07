import { NoteInputPort } from "../../unit-types";
import { oxLogger } from "./orchestration-logger";
import { IAudioContext } from "./types";
import { safeInvoke } from "./wrap-unit-call";

type NoteOffInvocationItem = {
  noteSourceUnitId: string;
  noteDestinationUnitId: string;
  notePort: NoteInputPort;
  noteNumber: number;
  time: number;
  sideEffects?: () => void;
};

type DelayedEventScheduler = {
  pushNoteOffInvocationItem(item: NoteOffInvocationItem): void;
  forceFlushEventsTillTime(time: number): void;
  flushPendingNotesOff(options?: { noteSourceUnitId?: string }): void;
};

export function createDelayedEventScheduler(
  audioContext: IAudioContext,
  aheadTimeMs = 50,
): DelayedEventScheduler {
  let queue: NoteOffInvocationItem[] = [];
  const aheadTimeSec = aheadTimeMs / 1000;

  let timerId: ReturnType<typeof setTimeout> | null = null;

  let flashTaskIndex = 0;

  const internal = {
    scheduleTimer() {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }

      if (queue.length === 0) {
        return;
      }

      const now = audioContext.currentTime;
      const nextTime = queue[0].time;
      const delayMs = Math.max(0, (nextTime - aheadTimeSec - now) * 1000);

      timerId = setTimeout(() => {
        timerId = null;
        internal.flushQueue();
      }, delayMs);
    },
    executeItem(item: NoteOffInvocationItem) {
      item.sideEffects?.();
      safeInvoke(item.notePort.noteOff)?.(item.noteNumber, item.time);
    },
    flushQueue() {
      const now = audioContext.currentTime;
      const thresholdTime = now + aheadTimeSec;

      oxLogger.deliveryTaskStart(flashTaskIndex);

      while (queue.length > 0 && queue[0].time <= thresholdTime) {
        const item = queue.shift();
        if (item) {
          internal.executeItem(item);
        }
      }
      oxLogger.deliveryTaskEnd(flashTaskIndex);
      flashTaskIndex += 1;

      if (queue.length > 0) {
        internal.scheduleTimer();
      }
    },
  };

  return {
    pushNoteOffInvocationItem(scheduledItem) {
      const now = audioContext.currentTime;
      const scheduledTime = scheduledItem.time;
      const thresholdTime = now + aheadTimeSec;

      const advancingItems = queue.filter(
        (item) =>
          item.noteSourceUnitId === scheduledItem.noteSourceUnitId &&
          item.noteDestinationUnitId === scheduledItem.noteDestinationUnitId &&
          item.noteNumber === scheduledItem.noteNumber &&
          item.time > scheduledTime,
      );
      if (advancingItems.length > 0) {
        for (const item of advancingItems) {
          item.time = scheduledTime;
        }
        queue.sort((a, b) => a.time - b.time);
      }

      if (scheduledTime <= thresholdTime) {
        internal.executeItem(scheduledItem);
        if (advancingItems.length > 0) {
          for (const item of advancingItems) {
            internal.executeItem(item);
          }
          queue = queue.filter((it) => !advancingItems.includes(it));
        }
        return;
      }

      const insertIndex = queue.findIndex((item) => item.time > scheduledTime);
      if (insertIndex === -1) {
        queue.push(scheduledItem);
      } else {
        queue.splice(insertIndex, 0, scheduledItem);
      }

      internal.scheduleTimer();
    },
    forceFlushEventsTillTime(time: number) {
      while (queue.length > 0 && queue[0].time <= time) {
        const item = queue.shift();
        if (item) {
          internal.executeItem(item);
        }
      }
    },
    flushPendingNotesOff(options) {
      const { noteSourceUnitId } = options ?? {};
      const items = queue.filter(
        (it) => !noteSourceUnitId || it.noteSourceUnitId == noteSourceUnitId,
      );
      for (const item of items) {
        item.time = audioContext.currentTime;
        internal.executeItem(item);
      }
      queue = queue.filter((it) => !items.includes(it));
    },
  };
}

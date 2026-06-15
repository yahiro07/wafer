export type WebAudioActionScheduler = {
  pushAction(action: () => void, time?: number): void;
};

export function createWebAudioActionScheduler(
  audioContext: AudioContext,
  aheadTimeMs = 50,
): WebAudioActionScheduler {
  type ScheduledAction = {
    action: () => void;
    time: number;
  };

  const queue: ScheduledAction[] = [];
  const aheadTimeSec = aheadTimeMs / 1000;

  let timerId: ReturnType<typeof setTimeout> | null = null;

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
    flushQueue() {
      const now = audioContext.currentTime;
      const thresholdTime = now + aheadTimeSec;

      while (queue.length > 0 && queue[0].time <= thresholdTime) {
        const scheduledAction = queue.shift();
        scheduledAction?.action();
      }

      if (queue.length > 0) {
        internal.scheduleTimer();
      }
    },
  };

  return {
    pushAction(action: () => void, time?: number) {
      const now = audioContext.currentTime;
      const scheduledTime = time ?? now;
      const thresholdTime = now + aheadTimeSec;

      if (scheduledTime <= thresholdTime) {
        action();
        return;
      }

      const scheduledAction: ScheduledAction = {
        action,
        time: scheduledTime,
      };

      const insertIndex = queue.findIndex((item) => item.time > scheduledTime);
      if (insertIndex === -1) {
        queue.push(scheduledAction);
      } else {
        queue.splice(insertIndex, 0, scheduledAction);
      }

      internal.scheduleTimer();
    },
  };
}

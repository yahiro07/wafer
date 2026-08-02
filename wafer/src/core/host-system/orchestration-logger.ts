type OrchestrationLogger = {
  clockingStart(): void;
  clockingStop(): void;
  clockingFrameStart(frameIndex: number): void;
  clockingFrameEnd(frameIndex: number): void;
  unitClockingFrameCall(unitId: string): void;
  noteEmit(args: {
    unitIdFrom: string;
    unitIdTo: string;
    noteNumber: number;
    isOn: boolean;
    time: number | undefined;
    noteId: string;
  }): void;
  noteReceived(args: {
    unitIdFrom: string;
    unitIdTo: string;
    noteNumber: number;
    isOn: boolean;
    time: number | undefined;
    noteId: string;
  }): void;
  deliveryTaskStart(taskIndex: number): void;
  deliveryTaskEnd(taskIndex: number): void;
};

function createOrchestrationLogger(): OrchestrationLogger {
  const log = console.log;
  return {
    clockingStart() {
      log(`◇clocking start`);
    },
    clockingStop() {
      log(`◇clocking stop`);
    },
    clockingFrameStart(frameIndex) {
      log(`◇clock frame ${frameIndex}`);
    },
    clockingFrameEnd(_frameIndex) {
      // log(`◇clock frame ${frameIndex} end`);
    },
    unitClockingFrameCall(unitId) {
      log(`  call clocking for ${unitId}`);
    },
    noteEmit(args) {
      const { unitIdFrom, unitIdTo, noteNumber, isOn, time, noteId } = args;
      log(
        `  note:${unitIdFrom}->${unitIdTo} ${noteNumber} ${isOn ? "on" : "off"} ${time?.toFixed(4)} ${noteId}`,
      );
    },
    noteReceived(args) {
      const { unitIdFrom, unitIdTo, noteNumber, isOn, time, noteId } = args;
      log(
        `    note-rcv:${unitIdFrom}->${unitIdTo} ${noteNumber} ${isOn ? "on" : "off"} ${time?.toFixed(4)} ${noteId}`,
      );
    },
    deliveryTaskStart(taskIndex) {
      log(`◇delivery task ${taskIndex}`);
    },
    deliveryTaskEnd(_taskIndex) {
      // log(`◇delivery task ${taskIndex} end`);
    },
  };
}

function createOrchestrationLoggerDummy(): OrchestrationLogger {
  return {
    clockingStart() {},
    clockingStop() {},
    clockingFrameStart() {},
    clockingFrameEnd() {},
    unitClockingFrameCall() {},
    noteEmit() {},
    noteReceived() {},
    deliveryTaskStart() {},
    deliveryTaskEnd() {},
  };
}

export const oxLogger = createOrchestrationLoggerDummy();

export function enableOxLogger() {
  Object.assign(oxLogger, createOrchestrationLogger());
}

// enableOxLogger(); //debug

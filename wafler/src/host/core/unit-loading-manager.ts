import { HsUnitInstance } from "../linkage/types";
import { HostStateBus } from "./host-state-bus";

type UnitLoadingJob = {
  unitId: string;
  promise: Promise<HsUnitInstance>;
  cancelled?: boolean;
  resolvedUnitInstance?: HsUnitInstance;
};

type PendingUnitOperationItem = {
  type: "connection" | "state";
  op: () => void;
};

function awaitPromiseWithTimeout<T>(
  promise: Promise<T>,
  timeout: number,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("Promise timed out"));
    }, timeout);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
}

export function createUnitsLoadingManager(bus: HostStateBus) {
  const unitLoadingJobs: UnitLoadingJob[] = [];
  const pendingUnitOperationItems: PendingUnitOperationItem[] = [];

  let isProcessing = false;

  const internal = {
    async waitPendingUnits() {
      let i = 0;
      while (i < unitLoadingJobs.length) {
        const job = unitLoadingJobs[i];
        try {
          job.resolvedUnitInstance = await awaitPromiseWithTimeout(
            job.promise,
            1000,
          );
        } catch (e) {
          console.error("Failed to load unit instance", job.unitId, e);
        }
        i++;
      }
      const newUnits = unitLoadingJobs
        .filter((job) => !job.cancelled && job.resolvedUnitInstance)
        .map((job) => job.resolvedUnitInstance!);

      unitLoadingJobs.length = 0;

      return newUnits;
    },
    async executeLoadingJobs() {
      if (!isProcessing) {
        isProcessing = true;
        bus.eventPort.emit({ type: "loadStarted" });

        //wait all unitInstances loaded in iframe
        const newUnits = await internal.waitPendingUnits();

        if (newUnits.length > 0) {
          for (const unit of newUnits) {
            bus.addUnit(unit);
          }
        }

        //connect units, apply persist states
        pendingUnitOperationItems.sort((a) =>
          a.type === "connection" ? -1 : 1,
        );
        for (const item of pendingUnitOperationItems) {
          item.op();
        }
        pendingUnitOperationItems.length = 0;

        bus.eventPort.emit({ type: "loadCompleted" });
        isProcessing = false;
        if (
          unitLoadingJobs.length > 0 ||
          pendingUnitOperationItems.length > 0
        ) {
          internal.reserveLoading();
        }
      }
    },
    reserveLoading() {
      if (!isProcessing) {
        setTimeout(internal.executeLoadingJobs, 0);
      }
    },
  };

  return {
    reserveLoadUnit(unitId: string, promise: Promise<HsUnitInstance>) {
      unitLoadingJobs.push({ unitId, promise });
      internal.reserveLoading();
    },
    cancelLoadUnit(promise: Promise<HsUnitInstance>) {
      const job = unitLoadingJobs.find((job) => job.promise === promise);
      if (job) {
        job.cancelled = true;
      }
    },
    reserveUnitOperation(item: PendingUnitOperationItem) {
      pendingUnitOperationItems.push(item);
      internal.reserveLoading();
    },
  };
}

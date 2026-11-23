import { SlotOccupiedError } from "./errors.js";
import { tryCreateHolder } from "./holder-file.js";
import { sleep } from "./sleep.js";
import type { HolderRecord } from "./types.js";

export interface AcquireSlotOptions {
  dir: string;
  jobId: string;
  concurrency: number;
  pollIntervalMs: number;
  reapStale: () => Promise<unknown>;
  enqueueWaiter: () => Promise<unknown>;
}

export async function acquireSlot(
  options: AcquireSlotOptions,
): Promise<HolderRecord> {
  let waiterQueued = false;

  while (true) {
    await options.reapStale();

    for (let slot = 0; slot < options.concurrency; slot += 1) {
      try {
        const holder = await tryCreateHolder({
          dir: options.dir,
          slot,
          jobId: options.jobId,
        });
        return holder;
      } catch (error) {
        if (error instanceof SlotOccupiedError) {
          continue;
        }
        throw error;
      }
    }

    if (!waiterQueued) {
      await options.enqueueWaiter();
      waiterQueued = true;
    }

    await sleep(options.pollIntervalMs);
  }
}

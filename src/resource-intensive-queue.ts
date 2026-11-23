import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { acquireSlot } from "./acquire-slot.js";
import { defaultQueueOptions } from "./defaults.js";
import { startHeartbeat, reapStaleHolders } from "./heartbeat.js";
import { releaseHolder } from "./holder-file.js";
import { dequeueWaiter, enqueueWaiter } from "./waiter.js";
import type { QueueJob, ResolvedRiQueueOptions, RiQueueOptions } from "./types.js";

export class ResourceIntensiveQueue {
  private readonly options: ResolvedRiQueueOptions;

  constructor(options: RiQueueOptions = {}) {
    const defaults = defaultQueueOptions();

    this.options = {
      dir: options.dir ?? defaults.dir,
      concurrency: options.concurrency ?? defaults.concurrency,
      pollIntervalMs: options.pollIntervalMs ?? defaults.pollIntervalMs,
      heartbeatIntervalMs:
        options.heartbeatIntervalMs ?? defaults.heartbeatIntervalMs,
      staleTimeoutMs: options.staleTimeoutMs ?? defaults.staleTimeoutMs,
    };

    if (this.options.concurrency < 1) {
      throw new Error("concurrency must be at least 1");
    }
  }

  async add<T>(job: QueueJob<T>): Promise<T> {
    await mkdir(this.options.dir, { recursive: true });
    const jobId = randomUUID();

    const holder = await acquireSlot({
      dir: this.options.dir,
      jobId,
      concurrency: this.options.concurrency,
      pollIntervalMs: this.options.pollIntervalMs,
      reapStale: () =>
        reapStaleHolders({
          dir: this.options.dir,
          concurrency: this.options.concurrency,
          staleTimeoutMs: this.options.staleTimeoutMs,
        }),
      enqueueWaiter: () => enqueueWaiter(this.options.dir, jobId),
    });

    await dequeueWaiter(this.options.dir, jobId);
    const stopHeartbeat = startHeartbeat(
      this.options.dir,
      holder.slot,
      this.options.heartbeatIntervalMs,
    );

    try {
      return await job();
    } finally {
      stopHeartbeat();
      await releaseHolder(this.options.dir, holder.slot);
    }
  }
}

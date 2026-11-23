import { describe, expect, it, vi } from "vitest";
import { acquireSlot } from "../src/acquire-slot.js";
import { tryCreateHolder } from "../src/holder-file.js";
import { withTempDir } from "./temp-dir.js";

describe("acquireSlot", () => {
  it("returns a holder when a slot is free", async () => {
    await withTempDir(async (dir) => {
      const holder = await acquireSlot({
        dir,
        jobId: "job-a",
        concurrency: 1,
        pollIntervalMs: 10,
        reapStale: vi.fn().mockResolvedValue([]),
        enqueueWaiter: vi.fn(),
      });

      expect(holder.slot).toBe(0);
      expect(holder.id).toBe("job-a");
    });
  });

  it("keeps looping after SlotOccupiedError until a slot is released", async () => {
    await withTempDir(async (dir) => {
      await tryCreateHolder({ dir, slot: 0, jobId: "blocking" });

      const enqueueWaiter = vi.fn().mockResolvedValue(undefined);
      const pending = acquireSlot({
        dir,
        jobId: "job-a",
        concurrency: 1,
        pollIntervalMs: 20,
        reapStale: vi.fn().mockResolvedValue([]),
        enqueueWaiter,
      });

      await vi.waitFor(() => {
        expect(enqueueWaiter).toHaveBeenCalledOnce();
      });

      const { unlink } = await import("node:fs/promises");
      const { holderPath } = await import("../src/paths.js");
      await unlink(holderPath(dir, 0));

      const holder = await pending;
      expect(holder.id).toBe("job-a");
      expect(holder.slot).toBe(0);
    });
  });

  it("queues a waiter.json only after every holder slot is occupied", async () => {
    await withTempDir(async (dir) => {
      await tryCreateHolder({ dir, slot: 0, jobId: "h0" });
      await tryCreateHolder({ dir, slot: 1, jobId: "h1" });

      const enqueueWaiter = vi.fn().mockResolvedValue(undefined);
      const pending = acquireSlot({
        dir,
        jobId: "waiter-job",
        concurrency: 2,
        pollIntervalMs: 15,
        reapStale: vi.fn().mockResolvedValue([]),
        enqueueWaiter,
      });

      await vi.waitFor(() => {
        expect(enqueueWaiter).toHaveBeenCalledOnce();
      });

      const { unlink } = await import("node:fs/promises");
      const { holderPath } = await import("../src/paths.js");
      await unlink(holderPath(dir, 1));

      const holder = await pending;
      expect(holder.slot).toBe(1);
    });
  });
});

import { readdir } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { holderPath, isWaiterFileName } from "../src/paths.js";
import { ResourceIntensiveQueue } from "../src/resource-intensive-queue.js";
import { sleep } from "../src/sleep.js";
import { writeJsonFile } from "../src/json-file.js";
import { withTempDir } from "./temp-dir.js";

describe("ResourceIntensiveQueue", () => {
  it("runs the queued function and returns its result", async () => {
    await withTempDir(async (dir) => {
      const queue = new ResourceIntensiveQueue({ dir, concurrency: 1 });
      const result = await queue.add(async () => "ok");
      expect(result).toBe("ok");
    });
  });

  it("never runs more jobs than concurrency", async () => {
    await withTempDir(async (dir) => {
      const queue = new ResourceIntensiveQueue({
        dir,
        concurrency: 2,
        pollIntervalMs: 15,
        heartbeatIntervalMs: 40,
        staleTimeoutMs: 1_000,
      });

      let running = 0;
      let maxRunning = 0;

      const job = async () => {
        running += 1;
        maxRunning = Math.max(maxRunning, running);
        await sleep(60);
        running -= 1;
      };

      await Promise.all([
        queue.add(job),
        queue.add(job),
        queue.add(job),
        queue.add(job),
      ]);

      expect(maxRunning).toBe(2);
    });
  });

  it("writes waiter.json while all holder slots are busy", async () => {
    await withTempDir(async (dir) => {
      const queue = new ResourceIntensiveQueue({
        dir,
        concurrency: 1,
        pollIntervalMs: 20,
        heartbeatIntervalMs: 40,
        staleTimeoutMs: 2_000,
      });

      let releaseCurrent: (() => void) | undefined;
      let markHolding: (() => void) | undefined;
      const holding = new Promise<void>((resolve) => {
        markHolding = resolve;
      });

      const first = queue.add(
        () =>
          new Promise<void>((resolve) => {
            releaseCurrent = resolve;
            markHolding?.();
          }),
      );

      await holding;
      const second = queue.add(async () => "second");

      await expect
        .poll(async () => {
          const names = await readdir(dir);
          return names.some(isWaiterFileName);
        })
        .toBe(true);

      releaseCurrent?.();
      await first;
      await expect(second).resolves.toBe("second");

      const leftover = await readdir(dir);
      expect(leftover.some(isWaiterFileName)).toBe(false);
    });
  });

  it("releases the holder when the job throws", async () => {
    await withTempDir(async (dir) => {
      const queue = new ResourceIntensiveQueue({ dir, concurrency: 1 });

      await expect(
        queue.add(async () => {
          throw new Error("boom");
        }),
      ).rejects.toThrow("boom");

      const result = await queue.add(async () => "recovered");
      expect(result).toBe("recovered");
    });
  });

  it("reclaims a stale holder so a waiter can run", async () => {
    await withTempDir(async (dir) => {
      await writeJsonFile(
        holderPath(dir, 0),
        {
          id: "dead",
          slot: 0,
          pid: 1,
          createdAt: 1,
          heartbeatAt: 1,
        },
        "wx",
      );

      const queue = new ResourceIntensiveQueue({
        dir,
        concurrency: 1,
        pollIntervalMs: 20,
        heartbeatIntervalMs: 40,
        staleTimeoutMs: 50,
      });

      const result = await queue.add(async () => "after-stale");
      expect(result).toBe("after-stale");
    });
  });
});

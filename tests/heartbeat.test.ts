import { describe, expect, it } from "vitest";
import {
  reapStaleHolders,
  startHeartbeat,
  touchHeartbeat,
} from "../src/heartbeat.js";
import { readHolder, tryCreateHolder } from "../src/holder-file.js";
import { sleep } from "../src/sleep.js";
import { withTempDir } from "./temp-dir.js";

describe("heartbeat", () => {
  it("updates heartbeatAt on a live holder", async () => {
    await withTempDir(async (dir) => {
      await tryCreateHolder({ dir, slot: 0, jobId: "job-a", now: 1 });
      await touchHeartbeat(dir, 0);
      const updated = await readHolder(dir, 0);
      expect(updated?.heartbeatAt).toBeGreaterThan(1);
    });
  });

  it("does not recreate a holder that was already released", async () => {
    await withTempDir(async (dir) => {
      await expect(touchHeartbeat(dir, 0)).resolves.toBeUndefined();
      await expect(readHolder(dir, 0)).resolves.toBeNull();
    });
  });

  it("removes holders whose heartbeat is older than the stale timeout", async () => {
    await withTempDir(async (dir) => {
      await tryCreateHolder({
        dir,
        slot: 0,
        jobId: "stale",
        now: 1_000,
      });
      await tryCreateHolder({
        dir,
        slot: 1,
        jobId: "fresh",
        now: 10_000,
      });

      const reaped = await reapStaleHolders({
        dir,
        concurrency: 2,
        staleTimeoutMs: 2_000,
        now: 10_000,
      });

      expect(reaped).toEqual([0]);
      await expect(readHolder(dir, 0)).resolves.toBeNull();
      await expect(readHolder(dir, 1)).resolves.toMatchObject({ id: "fresh" });
    });
  });

  it("periodically refreshes the holder while the heartbeat is running", async () => {
    await withTempDir(async (dir) => {
      await tryCreateHolder({ dir, slot: 0, jobId: "job-a", now: 1 });
      const stop = startHeartbeat(dir, 0, 30);
      await sleep(90);
      stop();
      const updated = await readHolder(dir, 0);
      expect(updated?.heartbeatAt).toBeGreaterThan(1);
    });
  });
});

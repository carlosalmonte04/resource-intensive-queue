import { describe, expect, it } from "vitest";
import { dequeueWaiter, enqueueWaiter, listWaiters } from "../src/waiter.js";
import { withTempDir } from "./temp-dir.js";

describe("waiter files", () => {
  it("writes waiter.json records and lists them in enqueue order", async () => {
    await withTempDir(async (dir) => {
      const first = await enqueueWaiter(dir, "a");
      const second = await enqueueWaiter(dir, "b");

      expect(first.id).toBe("a");
      const listed = await listWaiters(dir);
      expect(listed.map((waiter) => waiter.id)).toEqual(["a", "b"]);
      expect(second.createdAt).toBeGreaterThanOrEqual(first.createdAt);
    });
  });

  it("removes a waiter file when the job acquires a holder", async () => {
    await withTempDir(async (dir) => {
      await enqueueWaiter(dir, "a");
      await dequeueWaiter(dir, "a");
      await expect(listWaiters(dir)).resolves.toEqual([]);
    });
  });
});

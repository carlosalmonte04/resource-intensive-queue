import { access } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { SlotOccupiedError } from "../src/errors.js";
import {
  readHolder,
  releaseHolder,
  tryCreateHolder,
} from "../src/holder-file.js";
import { holderPath } from "../src/paths.js";
import { withTempDir } from "./temp-dir.js";

describe("tryCreateHolder", () => {
  it("creates an exclusive holder.json for an empty slot", async () => {
    await withTempDir(async (dir) => {
      const holder = await tryCreateHolder({
        dir,
        slot: 0,
        jobId: "job-a",
        now: 1_000,
      });

      expect(holder).toMatchObject({
        id: "job-a",
        slot: 0,
        createdAt: 1_000,
        heartbeatAt: 1_000,
      });
      await access(holderPath(dir, 0));
      await expect(readHolder(dir, 0)).resolves.toMatchObject({ id: "job-a" });
    });
  });

  it("throws SlotOccupiedError when the holder file already exists", async () => {
    await withTempDir(async (dir) => {
      await tryCreateHolder({ dir, slot: 0, jobId: "first" });

      await expect(
        tryCreateHolder({ dir, slot: 0, jobId: "second" }),
      ).rejects.toBeInstanceOf(SlotOccupiedError);
    });
  });

  it("allows a different slot while another holder exists", async () => {
    await withTempDir(async (dir) => {
      await tryCreateHolder({ dir, slot: 0, jobId: "first" });
      const second = await tryCreateHolder({ dir, slot: 1, jobId: "second" });
      expect(second.slot).toBe(1);
    });
  });
});

describe("releaseHolder", () => {
  it("removes the holder file and is idempotent", async () => {
    await withTempDir(async (dir) => {
      await tryCreateHolder({ dir, slot: 0, jobId: "job-a" });
      await releaseHolder(dir, 0);
      await expect(readHolder(dir, 0)).resolves.toBeNull();
      await expect(releaseHolder(dir, 0)).resolves.toBeUndefined();
    });
  });
});

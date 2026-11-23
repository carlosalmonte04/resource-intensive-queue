import { rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import riQueue from "../src/index.js";

describe("package default export", () => {
  afterAll(async () => {
    await rm(path.resolve(process.cwd(), ".ri-queue"), {
      recursive: true,
      force: true,
    });
  });

  it("exports a ready-to-use queue with add()", async () => {
    expect(typeof riQueue.add).toBe("function");
    await expect(riQueue.add(async () => 42)).resolves.toBe(42);
  });
});

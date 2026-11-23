import path from "node:path";
import { describe, expect, it } from "vitest";
import { defaultQueueOptions } from "../src/defaults.js";

describe("defaultQueueOptions", () => {
  it("uses the shared .ri-queue directory and one concurrent holder", () => {
    const options = defaultQueueOptions({}, "/tmp/project");

    expect(options).toEqual({
      dir: path.resolve("/tmp/project", ".ri-queue"),
      concurrency: 1,
      pollIntervalMs: 50,
      heartbeatIntervalMs: 1_000,
      staleTimeoutMs: 15_000,
    });
  });

  it("reads optional overrides from the environment", () => {
    const options = defaultQueueOptions(
      {
        RI_QUEUE_DIR: "/var/queue",
        RI_QUEUE_CONCURRENCY: "4",
        RI_QUEUE_STALE_TIMEOUT_MS: "20000",
      },
      "/tmp/project",
    );

    expect(options.dir).toBe("/var/queue");
    expect(options.concurrency).toBe(4);
    expect(options.staleTimeoutMs).toBe(20_000);
  });
});

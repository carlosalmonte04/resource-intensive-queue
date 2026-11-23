import path from "node:path";
import type { RiQueueOptions } from "./types.js";

export const DEFAULT_DIR = ".ri-queue";
export const DEFAULT_CONCURRENCY = 1;
export const DEFAULT_POLL_INTERVAL_MS = 50;
export const DEFAULT_HEARTBEAT_INTERVAL_MS = 1_000;
export const DEFAULT_STALE_TIMEOUT_MS = 15_000;

function readPositiveInt(value: string | undefined, fallback: number): number {
  if (value === undefined || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return parsed;
}

export function defaultQueueOptions(
  env: NodeJS.ProcessEnv = process.env,
  cwd: string = process.cwd(),
): Required<RiQueueOptions> {
  const dir = env.RI_QUEUE_DIR?.trim()
    ? path.resolve(cwd, env.RI_QUEUE_DIR)
    : path.resolve(cwd, DEFAULT_DIR);

  return {
    dir,
    concurrency: readPositiveInt(env.RI_QUEUE_CONCURRENCY, DEFAULT_CONCURRENCY),
    pollIntervalMs: readPositiveInt(
      env.RI_QUEUE_POLL_INTERVAL_MS,
      DEFAULT_POLL_INTERVAL_MS,
    ),
    heartbeatIntervalMs: readPositiveInt(
      env.RI_QUEUE_HEARTBEAT_INTERVAL_MS,
      DEFAULT_HEARTBEAT_INTERVAL_MS,
    ),
    staleTimeoutMs: readPositiveInt(
      env.RI_QUEUE_STALE_TIMEOUT_MS,
      DEFAULT_STALE_TIMEOUT_MS,
    ),
  };
}

import { open, unlink } from "node:fs/promises";
import { isMissingFileError } from "./errors.js";
import { readHolder } from "./holder-file.js";
import { holderPath } from "./paths.js";
import type { HolderRecord } from "./types.js";

export async function touchHeartbeat(dir: string, slot: number): Promise<void> {
  const filePath = holderPath(dir, slot);
  let handle;

  try {
    handle = await open(filePath, "r+");
    const raw = await handle.readFile("utf8");
    const record = JSON.parse(raw) as HolderRecord;
    record.heartbeatAt = Date.now();
    await handle.truncate(0);
    await handle.write(`${JSON.stringify(record, null, 2)}\n`, 0, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return;
    }
    throw error;
  } finally {
    await handle?.close();
  }
}

export function startHeartbeat(
  dir: string,
  slot: number,
  intervalMs: number,
): () => void {
  const timer = setInterval(() => {
    void touchHeartbeat(dir, slot);
  }, intervalMs);

  return () => {
    clearInterval(timer);
  };
}

export async function reapStaleHolders(options: {
  dir: string;
  concurrency: number;
  staleTimeoutMs: number;
  now?: number;
}): Promise<number[]> {
  const now = options.now ?? Date.now();
  const reaped: number[] = [];

  for (let slot = 0; slot < options.concurrency; slot += 1) {
    const record = await readHolder(options.dir, slot);
    if (!record) {
      continue;
    }

    if (now - record.heartbeatAt <= options.staleTimeoutMs) {
      continue;
    }

    try {
      await unlink(holderPath(options.dir, slot));
      reaped.push(slot);
    } catch (error) {
      if (isMissingFileError(error)) {
        continue;
      }
      throw error;
    }
  }

  return reaped;
}

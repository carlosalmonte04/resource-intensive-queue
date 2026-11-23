import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { isMissingFileError } from "./errors.js";
import { readJsonFile, writeJsonFile } from "./json-file.js";
import { isWaiterFileName, waiterPath } from "./paths.js";
import type { WaiterRecord } from "./types.js";

export async function enqueueWaiter(dir: string, id: string): Promise<WaiterRecord> {
  const record: WaiterRecord = {
    id,
    pid: process.pid,
    createdAt: Date.now(),
  };

  await writeJsonFile(waiterPath(dir, id), record, "wx");
  return record;
}

export async function dequeueWaiter(dir: string, id: string): Promise<void> {
  try {
    await unlink(waiterPath(dir, id));
  } catch (error) {
    if (isMissingFileError(error)) {
      return;
    }
    throw error;
  }
}

export async function listWaiters(dir: string): Promise<WaiterRecord[]> {
  const names = await readdir(dir);
  const waiters: WaiterRecord[] = [];

  for (const name of names) {
    if (!isWaiterFileName(name)) {
      continue;
    }

    try {
      waiters.push(await readJsonFile<WaiterRecord>(path.join(dir, name)));
    } catch (error) {
      if (isMissingFileError(error)) {
        continue;
      }
      throw error;
    }
  }

  return waiters.sort((a, b) => a.createdAt - b.createdAt);
}

import { unlink } from "node:fs/promises";
import { isAlreadyExistsError, isMissingFileError, SlotOccupiedError } from "./errors.js";
import { writeJsonFile, readJsonFile } from "./json-file.js";
import { holderPath } from "./paths.js";
import type { HolderRecord } from "./types.js";

export async function tryCreateHolder(options: {
  dir: string;
  slot: number;
  jobId: string;
  now?: number;
}): Promise<HolderRecord> {
  const now = options.now ?? Date.now();
  const record: HolderRecord = {
    id: options.jobId,
    slot: options.slot,
    pid: process.pid,
    createdAt: now,
    heartbeatAt: now,
  };

  try {
    await writeJsonFile(holderPath(options.dir, options.slot), record, "wx");
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      throw new SlotOccupiedError(options.slot);
    }
    throw error;
  }

  return record;
}

export async function readHolder(
  dir: string,
  slot: number,
): Promise<HolderRecord | null> {
  try {
    return await readJsonFile<HolderRecord>(holderPath(dir, slot));
  } catch (error) {
    if (isMissingFileError(error)) {
      return null;
    }
    throw error;
  }
}

export async function releaseHolder(dir: string, slot: number): Promise<void> {
  try {
    await unlink(holderPath(dir, slot));
  } catch (error) {
    if (isMissingFileError(error)) {
      return;
    }
    throw error;
  }
}

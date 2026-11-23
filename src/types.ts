export type QueueJob<T> = () => Promise<T> | T;

export interface RiQueueOptions {
  dir?: string;
  concurrency?: number;
  pollIntervalMs?: number;
  heartbeatIntervalMs?: number;
  staleTimeoutMs?: number;
}

export interface ResolvedRiQueueOptions {
  dir: string;
  concurrency: number;
  pollIntervalMs: number;
  heartbeatIntervalMs: number;
  staleTimeoutMs: number;
}

export interface HolderRecord {
  id: string;
  slot: number;
  pid: number;
  createdAt: number;
  heartbeatAt: number;
}

export interface WaiterRecord {
  id: string;
  pid: number;
  createdAt: number;
}

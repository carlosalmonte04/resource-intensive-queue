import path from "node:path";

export function holderFileName(slot: number): string {
  return `holder-${slot}.json`;
}

export function waiterFileName(id: string): string {
  return `waiter-${id}.json`;
}

export function holderPath(dir: string, slot: number): string {
  return path.join(dir, holderFileName(slot));
}

export function waiterPath(dir: string, id: string): string {
  return path.join(dir, waiterFileName(id));
}

export function isHolderFileName(fileName: string): boolean {
  return /^holder-\d+\.json$/.test(fileName);
}

export function isWaiterFileName(fileName: string): boolean {
  return /^waiter-.+\.json$/.test(fileName);
}

export class SlotOccupiedError extends Error {
  readonly slot: number;

  constructor(slot: number) {
    super(`Holder slot ${slot} is already occupied`);
    this.name = "SlotOccupiedError";
    this.slot = slot;
  }
}

export function isAlreadyExistsError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "EEXIST"
  );
}

export function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ENOENT"
  );
}

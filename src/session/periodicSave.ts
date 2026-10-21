/** Explicit transactions and leaving still save immediately. Moving checkpoints are less frequent. */
export function periodicSaveDue(now: number, last: number, inVehicle: boolean): boolean {
  return now - last >= (inVehicle ? 12000 : 2000);
}

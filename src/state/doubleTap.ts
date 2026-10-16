/** Canvas-only taps. Joystick touches are tracked separately so movement can stay held. */
export class DoubleTap {
  private active: { id: number; x: number; y: number; at: number } | null = null;
  private previous: { x: number; y: number; at: number } | null = null;

  reset() { this.active = null; this.previous = null; }

  down(id: number, x: number, y: number, at: number) {
    if (this.active) { this.reset(); return; }
    this.active = { id, x, y, at };
  }

  move(id: number, x: number, y: number) {
    const a = this.active;
    if (a?.id === id && Math.hypot(x - a.x, y - a.y) > 12) this.reset();
  }

  up(id: number, x: number, y: number, at: number): boolean {
    const a = this.active;
    if (!a || a.id !== id) return false;
    this.active = null;
    if (at - a.at > 250 || Math.hypot(x - a.x, y - a.y) > 12) {
      this.reset(); return false;
    }
    const p = this.previous;
    if (p && at - p.at <= 350 && Math.hypot(x - p.x, y - p.y) <= 48) {
      this.previous = null; return true;
    }
    this.previous = { x, y, at };
    return false;
  }
}

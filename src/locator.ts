export interface Point {
  x: number;
  y: number;
  z?: number;
  timestamp: number; // Unix timestamp in milliseconds
  [key: string]: any; // Allow extra metadata
}

export class Locator {
  private buffer: Point[] = [];
  private maxBufferSize: number = 1000;

  /**
   * Adds a new coordinate point to the buffer.
   * Automatically sorts by timestamp to ensure order.
   * @param point The coordinate point to add.
   */
  public push(point: Point) {
    // Insert and keep sorted (simple approach for now, assuming mostly append)
    if (this.buffer.length > 0 && point.timestamp < this.buffer[this.buffer.length - 1].timestamp) {
       // If out of order, push and resort (or find index). 
       // For efficiency in real-time, we usually expect sorted input.
       this.buffer.push(point);
       this.buffer.sort((a, b) => a.timestamp - b.timestamp);
    } else {
      this.buffer.push(point);
    }

    // Prune buffer if too large
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift();
    }
  }

  /**
   * Retrieves the interpolated position at a specific timestamp.
   * @param timestamp The time to query.
   * @returns The interpolated point or null if out of range/empty.
   */
  public getPositionAt(timestamp: number): Point | null {
    if (this.buffer.length === 0) return null;

    // 1. Check boundaries
    if (timestamp <= this.buffer[0].timestamp) {
      return { ...this.buffer[0] };
    }
    if (timestamp >= this.buffer[this.buffer.length - 1].timestamp) {
      return { ...this.buffer[this.buffer.length - 1] };
    }

    // 2. Find surrounding points (Binary search could be better for large buffers, linear for small/end)
    // Since we often query near the end, iterating backwards might be fast.
    let index = -1;
    for (let i = this.buffer.length - 1; i >= 0; i--) {
      if (this.buffer[i].timestamp <= timestamp) {
        index = i;
        break;
      }
    }

    if (index === -1 || index === this.buffer.length - 1) {
      // Should be covered by boundary checks, but safety net
      return { ...this.buffer[this.buffer.length - 1] };
    }

    const p0 = this.buffer[index];
    const p1 = this.buffer[index + 1];

    // 3. Linear Interpolation
    const t = (timestamp - p0.timestamp) / (p1.timestamp - p0.timestamp);
    
    return {
      x: p0.x + (p1.x - p0.x) * t,
      y: p0.y + (p1.y - p0.y) * t,
      z: (p0.z !== undefined && p1.z !== undefined) ? p0.z + (p1.z - p0.z) * t : undefined,
      timestamp: timestamp,
      meta: p0.meta // Carry over metadata from the previous point
    };
  }

  /**
   * Clears the history buffer.
   */
  public clear() {
    this.buffer = [];
  }

  /**
   * Get the latest known point.
   */
  public getLatest(): Point | null {
    if (this.buffer.length === 0) return null;
    return { ...this.buffer[this.buffer.length - 1] };
  }
}

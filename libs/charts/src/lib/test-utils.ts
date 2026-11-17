/** Test-only helper: a ResizeObserver that immediately reports a fixed width. */
export function stubResizeObserver(width = 600) {
  class FixedResizeObserver {
    constructor(private readonly cb: ResizeObserverCallback) {}
    observe(target: Element) {
      this.cb([{ target, contentRect: { width, height: 240 } } as unknown as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    unobserve() {
      /* no-op */
    }
    disconnect() {
      /* no-op */
    }
  }
  globalThis.ResizeObserver = FixedResizeObserver as unknown as typeof ResizeObserver;
}

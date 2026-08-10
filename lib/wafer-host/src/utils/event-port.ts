export type EventPort<TEvent extends object> = {
  emit(ev: TEvent): void;
  subscribe(fn: (ev: TEvent) => void): () => void;
};

export function createEventPort<TEvent extends object>(): EventPort<TEvent> {
  const listeners = new Set<(ev: TEvent) => void>();
  return {
    emit(ev: TEvent) {
      listeners.forEach((fn) => {
        fn(ev);
      });
    },
    subscribe(fn: (ev: TEvent) => void) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

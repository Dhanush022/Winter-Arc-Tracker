const store = new Map<string, unknown>();

export function getCached<T>(key: string): T | undefined {
  return store.get(key) as T | undefined;
}

export function setCached(key: string, value: unknown): void {
  store.set(key, value);
}

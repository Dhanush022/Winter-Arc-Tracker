const store = new Map<string, any>();

export function getCached<T>(key: string): T | undefined {
  return store.get(key);
}

export function setCached(key: string, value: any): void {
  store.set(key, value);
}

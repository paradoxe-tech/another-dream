interface Array<T> {
  shape(): number[];
}

declare function get(url: string): string;

declare async function sleep(ms: number): Promise<void>;
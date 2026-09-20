declare module 'node:fs' {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
  export function writeFileSync(file: string, data: string | Uint8Array, options?: { encoding?: string; flag?: string } | string): void;
  export function readFileSync(file: string, options?: { encoding?: string; flag?: string } | string): string;
  export function existsSync(path: string): boolean;
  export function readdirSync(path: string): string[];
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function dirname(p: string): string;
  export function basename(p: string, ext?: string): string;
}

declare const process: {
  env: Record<string, string | undefined>;
  cwd: () => string;
};

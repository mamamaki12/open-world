export function parseVersion(text: string): [number, number, number];
export function formatVersion(base: [number, number, number], commits: number): string;
export function appVersion(root?: string): string;

export interface AppBuild { id: string; version: string; builtAt: string }
export type VersionResult = { status: 'current' | 'update' | 'unavailable'; latest?: AppBuild };

export function validBuild(value: unknown): value is AppBuild {
  if (!value || typeof value !== 'object') return false;
  const b = value as AppBuild;
  return typeof b.id === 'string' && b.id.length > 0 && b.id.length < 200 &&
    typeof b.version === 'string' && b.version.length > 0 && b.version.length < 80 &&
    typeof b.builtAt === 'string' && Number.isFinite(Date.parse(b.builtAt));
}
export function compareBuild(current: AppBuild, latest: AppBuild): VersionResult {
  if (current.id === latest.id) return { status: 'current', latest };
  // A delayed CDN response must not label a newer running build as outdated or current.
  return Date.parse(latest.builtAt) > Date.parse(current.builtAt) ? { status: 'update', latest } : { status: 'unavailable' };
}
export async function fetchLatestBuild(signal: AbortSignal): Promise<AppBuild> {
  const url = new URL('version.json', document.baseURI);
  url.searchParams.set('check', Date.now().toString(36));
  const response = await fetch(url, { cache: 'no-store', signal, headers: { Accept: 'application/json' } });
  if (!response.ok) throw Error('Version request failed');
  const value: unknown = await response.json();
  if (!validBuild(value)) throw Error('Invalid version response');
  return value;
}

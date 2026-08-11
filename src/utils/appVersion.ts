/** Wstrzykiwane w vite.config.ts przy buildzie (VERCEL_GIT_COMMIT_SHA lub timestamp). */
export const CURRENT_BUILD_ID: string =
  (import.meta.env.VITE_APP_BUILD_ID as string | undefined) || 'local';

export interface RemoteBuildInfo {
  buildId: string;
  changelog?: string;
  builtAt?: string;
}

export async function fetchRemoteBuildInfo(): Promise<RemoteBuildInfo | null> {
  try {
    const res = await fetch(`/build-id.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as RemoteBuildInfo;
    if (!data.buildId) return null;
    return data;
  } catch {
    return null;
  }
}

export function isNewerBuildAvailable(remote: RemoteBuildInfo): boolean {
  if (!CURRENT_BUILD_ID || CURRENT_BUILD_ID === 'local') return false;
  return remote.buildId !== CURRENT_BUILD_ID;
}

export const CURRENT_BUILD_ID: string =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  (typeof import.meta !== 'undefined' && (import.meta as unknown as { env?: { VITE_APP_BUILD_ID?: string } }).env?.VITE_APP_BUILD_ID) ||
  'local';

export interface RemoteBuildInfo {
  buildId: string;
  changelog?: string;
  builtAt?: string;
}

export async function fetchRemoteBuildInfo(): Promise<RemoteBuildInfo | null> {
  return null;
}

export function isNewerBuildAvailable(remote: RemoteBuildInfo): boolean {
  if (!CURRENT_BUILD_ID || CURRENT_BUILD_ID === 'local') return false;
  return remote.buildId !== CURRENT_BUILD_ID;
}

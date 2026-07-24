/**
 * Multi-branże użytkownika: localStorage + sync do profiles.niche.
 * Primary (pierwsza) nadal idzie przez userNiche dla kompatybilności.
 */

import { getSupabase } from '../services/supabaseClient';
import { getAllIndustryPacks, getIndustryPackById, type IndustryPack, type IndustryPackId } from './industryPacks';
import { getUserNiche, setUserNiche } from './userNiche';

const GLOBAL_IDS_KEY = 'userIndustryIds';
const PENDING_IDS_KEY = 'pendingUserIndustryIds';

function perUserIdsKey(userId: string): string {
  return `${GLOBAL_IDS_KEY}_${userId}`;
}

function readIds(key: string): IndustryPackId[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw?.trim()) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const known = new Set(getAllIndustryPacks().map((p) => p.id));
    return parsed.filter((id): id is IndustryPackId => typeof id === 'string' && known.has(id as IndustryPackId));
  } catch {
    return [];
  }
}

function writeIds(key: string, ids: IndustryPackId[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

export function industryIdsToLabels(ids: IndustryPackId[]): string[] {
  return ids
    .map((id) => getIndustryPackById(id)?.name)
    .filter((name): name is string => Boolean(name));
}

export function formatIndustriesLabel(ids: IndustryPackId[]): string {
  const labels = industryIdsToLabels(ids);
  if (labels.length === 0) return '';
  return labels.join(' · ');
}

/** Parsuj profiles.niche / legacy string → pack IDs. */
export function parseIndustryIdsFromNiche(niche: string): IndustryPackId[] {
  const trimmed = niche.trim();
  if (!trimmed || trimmed === 'marketing') return [];

  try {
    const asJson = JSON.parse(trimmed) as unknown;
    if (asJson && typeof asJson === 'object' && Array.isArray((asJson as { ids?: unknown }).ids)) {
      return readIdsFromArray((asJson as { ids: unknown[] }).ids);
    }
  } catch {
    // not JSON
  }

  const packs = getAllIndustryPacks();
  const found: IndustryPackId[] = [];
  const lower = trimmed.toLowerCase();

  for (const pack of packs) {
    if (lower.includes(pack.name.toLowerCase()) || pack.nicheKeywords.some((k) => lower.includes(k))) {
      if (!found.includes(pack.id)) found.push(pack.id);
    }
  }

  if (found.length === 0) {
    const parts = trimmed.split(/\s*[·|,;/]\s*/).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
      const match = packs.find(
        (p) =>
          p.name.toLowerCase() === part.toLowerCase() ||
          p.nicheKeywords.some((k) => part.toLowerCase().includes(k))
      );
      if (match && !found.includes(match.id)) found.push(match.id);
    }
  }

  return found;
}

function readIdsFromArray(arr: unknown[]): IndustryPackId[] {
  const known = new Set(getAllIndustryPacks().map((p) => p.id));
  return arr.filter((id): id is IndustryPackId => typeof id === 'string' && known.has(id as IndustryPackId));
}

export function getUserIndustryIds(userId?: string | null): IndustryPackId[] {
  try {
    if (userId) {
      const perUser = readIds(perUserIdsKey(userId));
      if (perUser.length > 0) return perUser;
    }
    const global = readIds(GLOBAL_IDS_KEY);
    if (global.length > 0) return global;

    const niche = getUserNiche(userId, '');
    if (niche && niche !== 'marketing') {
      return parseIndustryIdsFromNiche(niche);
    }
  } catch {
    // ignore
  }
  return [];
}

export function getUserIndustryPacks(userId?: string | null): IndustryPack[] {
  return getUserIndustryIds(userId)
    .map((id) => getIndustryPackById(id))
    .filter((p): p is IndustryPack => Boolean(p));
}

export function getPendingIndustryIds(): IndustryPackId[] {
  return readIds(PENDING_IDS_KEY);
}

export function setPendingIndustryIds(ids: IndustryPackId[]): void {
  const unique = Array.from(new Set(ids));
  writeIds(PENDING_IDS_KEY, unique);
}

export function clearPendingIndustryIds(): void {
  try {
    localStorage.removeItem(PENDING_IDS_KEY);
  } catch {
    // ignore
  }
}

export interface PersistIndustriesOptions {
  userId?: string | null;
  /** Sync do Supabase profiles.niche (wymaga userId). Domyślnie true gdy jest userId. */
  syncRemote?: boolean;
}

/**
 * Zapisuje listę branż lokalnie (+ opcjonalnie remote).
 * Pierwsza = primary → userNiche.
 */
export async function setUserIndustryIds(
  ids: IndustryPackId[],
  opts?: PersistIndustriesOptions
): Promise<IndustryPackId[]> {
  const unique = Array.from(new Set(ids));
  const userId = opts?.userId ?? null;

  writeIds(GLOBAL_IDS_KEY, unique);
  if (userId) writeIds(perUserIdsKey(userId), unique);

  const label = formatIndustriesLabel(unique);
  if (label) {
    setUserNiche(label, userId);
  } else if (unique.length === 0) {
    // keep niche as-is if empty clear — caller decides
  }

  const shouldSync = Boolean(userId) && (opts?.syncRemote !== false);
  if (shouldSync && userId) {
    await syncIndustriesToProfile(userId, unique).catch(() => undefined);
  }

  return unique;
}

export async function toggleUserIndustry(
  packId: IndustryPackId,
  opts?: PersistIndustriesOptions
): Promise<IndustryPackId[]> {
  const current = getUserIndustryIds(opts?.userId);
  const next = current.includes(packId)
    ? current.filter((id) => id !== packId)
    : [...current, packId];
  return setUserIndustryIds(next, opts);
}

export async function addUserIndustry(
  packId: IndustryPackId,
  opts?: PersistIndustriesOptions
): Promise<IndustryPackId[]> {
  const current = getUserIndustryIds(opts?.userId);
  if (current.includes(packId)) return current;
  return setUserIndustryIds([...current, packId], opts);
}

export async function syncIndustriesToProfile(
  userId: string,
  ids: IndustryPackId[] = getUserIndustryIds(userId)
): Promise<void> {
  const label = formatIndustriesLabel(ids);
  const payload = label || null;
  try {
    const supabase = getSupabase();
    await supabase.from('profiles').update({ niche: payload }).eq('id', userId);
  } catch {
    // remote sync optional
  }
}

/**
 * Po logowaniu/rejestracji: pending z landingu → konto,
 * albo hydratacja z profiles.niche.
 */
export async function hydrateIndustriesOnAuth(
  userId: string,
  profileNiche?: string | null
): Promise<IndustryPackId[]> {
  const pending = getPendingIndustryIds();
  if (pending.length > 0) {
    const saved = await setUserIndustryIds(pending, { userId, syncRemote: true });
    clearPendingIndustryIds();
    return saved;
  }

  const existing = getUserIndustryIds(userId);
  if (existing.length > 0) {
    if (profileNiche?.trim() && parseIndustryIdsFromNiche(profileNiche).length === 0) {
      // local wins; push to remote if profile empty-ish
      await syncIndustriesToProfile(userId, existing).catch(() => undefined);
    }
    return existing;
  }

  if (profileNiche?.trim()) {
    const fromProfile = parseIndustryIdsFromNiche(profileNiche);
    if (fromProfile.length > 0) {
      return setUserIndustryIds(fromProfile, { userId, syncRemote: false });
    }
    setUserNiche(profileNiche.trim(), userId);
  }

  return getUserIndustryIds(userId);
}

/** Primary pack (pierwszy wybrany) — do prefilli generatora. */
export function getPrimaryIndustryPack(userId?: string | null): IndustryPack | null {
  const ids = getUserIndustryIds(userId);
  if (ids.length === 0) return null;
  return getIndustryPackById(ids[0]) ?? null;
}

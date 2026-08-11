import type { PostApprovalStatus } from '../types';

/** Blokuje publish-now gdy treść czeka na akceptację lub jest odrzucona. */
export function isApprovalBlockingPublish(
  approvalStatus: PostApprovalStatus | string | null | undefined
): boolean {
  const status = (approvalStatus || 'draft').toLowerCase();
  return status === 'pending_approval' || status === 'rejected';
}

export function approvalBlockMessage(
  approvalStatus: PostApprovalStatus | string | null | undefined
): string {
  const status = (approvalStatus || 'draft').toLowerCase();
  if (status === 'pending_approval') {
    return 'Post oczekuje na akceptację — najpierw zatwierdź w kolejce akceptacji.';
  }
  if (status === 'rejected') {
    return 'Post został odrzucony — nie można opublikować.';
  }
  return 'Publikacja zablokowana przez status akceptacji.';
}

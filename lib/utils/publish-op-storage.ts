/**
 * Per-hackathon persistence of the in-flight publish escrow op id.
 *
 * Publishing is async: the backend moves the hackathon to DRAFT_AWAITING_FUNDING
 * and a reconciliation worker settles the op later. Persisting the op row id
 * lets the webapp resume polling after a reload / navigation instead of
 * re-issuing publish (which the backend rejects once the row leaves DRAFT).
 */
const PUBLISH_OP_STORAGE_PREFIX = 'boundless_publish_op_';

const storageKey = (hackathonId: string) =>
  `${PUBLISH_OP_STORAGE_PREFIX}${hackathonId}`;

export function readPublishOpId(hackathonId: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(storageKey(hackathonId));
  } catch {
    return null;
  }
}

export function persistPublishOpId(hackathonId: string, opRowId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(storageKey(hackathonId), opRowId);
  } catch {
    // ignore
  }
}

export function clearPublishOpId(hackathonId: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(storageKey(hackathonId));
  } catch {
    // ignore
  }
}

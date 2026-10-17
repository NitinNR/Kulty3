/**
 * Single source of truth for "does this user hold a live membership?".
 *
 * Previously the only check anywhere in the codebase was
 * `subscription.status === 'active'`, which ignores `subscription.endDate` —
 * so a membership that had lapsed still scanned venues forever. Every
 * entitlement decision now goes through here.
 */

/** A missing/blank endDate means "no expiry recorded" → treat as live (legacy-safe). */
export const isSubscriptionLive = (subscription, now = new Date()) => {
  if (!subscription || subscription.status !== 'active') return false;
  if (!subscription.endDate) return true;
  return new Date(subscription.endDate).getTime() > now.getTime();
};

/** Whole days remaining, floored at 0. Used for renewal messaging. */
export const daysUntilExpiry = (subscription, now = new Date()) => {
  if (!subscription?.endDate) return null;
  const ms = new Date(subscription.endDate).getTime() - now.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};

/**
 * Where a new paid term should start.
 *
 * Renewing early must not destroy paid-for days, so an unexpired membership is
 * extended from its existing endDate instead of from today. A lapsed or
 * never-paid membership starts today.
 */
export const nextTermStart = (subscription, now = new Date()) => {
  if (isSubscriptionLive(subscription, now) && subscription?.endDate) {
    return new Date(subscription.endDate);
  }
  return now;
};

export const addYears = (from, years = 1) => {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + years);
  return d;
};
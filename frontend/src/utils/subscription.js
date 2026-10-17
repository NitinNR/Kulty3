/**
 * Client-side mirror of backend/src/utils/subscription.js.
 *
 * The server is always the authority — this only stops the UI from bouncing a
 * paying member away from checkout, or showing an active card, when the stored
 * term has actually lapsed.
 */

/** A missing endDate means "no expiry recorded" → treat as live (legacy-safe). */
export const isSubscriptionLive = (subscription, now = new Date()) => {
  if (!subscription || subscription.status !== 'active') return false;
  if (!subscription.endDate) return true;
  return new Date(subscription.endDate).getTime() > now.getTime();
};

export const daysUntilExpiry = (subscription, now = new Date()) => {
  if (!subscription?.endDate) return null;
  const ms = new Date(subscription.endDate).getTime() - now.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
};
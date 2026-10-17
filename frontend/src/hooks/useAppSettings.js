import { useSyncExternalStore } from 'react';
import { getPublicSettings } from '../services/api';

// Shared, cached view of the global app settings. The login screen reads this
// to know which sign-in methods the admin has enabled, and the admin settings
// page pushes updates back into it so changes apply without a reload.
//
// Defaults to "both enabled" until the server responds (and if the request
// fails), so a slow/absent API never hides every way to sign in.

const DEFAULT_AUTH_METHODS = { google: true, phone: true };

let snapshot = { loaded: false, authMethods: DEFAULT_AUTH_METHODS };
let inflight = null;
const subscribers = new Set();

const getSnapshot = () => snapshot;
const emit = () => subscribers.forEach((onChange) => onChange());

const publish = (next) => {
  if (
    next.loaded === snapshot.loaded &&
    next.authMethods.google === snapshot.authMethods.google &&
    next.authMethods.phone === snapshot.authMethods.phone
  ) {
    return;
  }
  snapshot = next;
  emit();
};

const normalize = (auth) => ({
  google: auth?.google !== false,
  phone: auth?.phone !== false,
});

/** Fetches the settings once and caches them. */
export const loadAppSettings = () => {
  if (inflight) return inflight;
  inflight = getPublicSettings()
    .then((res) => publish({ loaded: true, authMethods: normalize(res.data?.authMethods) }))
    .catch(() => publish({ loaded: true, authMethods: DEFAULT_AUTH_METHODS }))
    .finally(() => { inflight = null; });
  return inflight;
};

/** Applies auth methods locally (used by the admin page after saving). */
export const setAppAuthMethods = (authMethods) => {
  publish({ loaded: true, authMethods: normalize(authMethods) });
};

const subscribe = (onChange) => {
  subscribers.add(onChange);
  if (!snapshot.loaded) loadAppSettings();
  return () => subscribers.delete(onChange);
};

export const useAppSettings = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

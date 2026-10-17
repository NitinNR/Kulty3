/**
 * Escape a user-supplied string so it can be embedded safely inside a RegExp.
 *
 * Search/city query params were previously interpolated straight into
 * `new RegExp(...)`, letting a caller inject regex metacharacters — a
 * ReDoS/CPU-exhaustion vector (e.g. `search=(a+)+$`) and a way to broaden a
 * lookup unexpectedly. Always wrap untrusted input with this first.
 */
const escapeRegex = (value) => String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export default escapeRegex;

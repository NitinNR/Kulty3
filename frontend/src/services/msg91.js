// MSG91 OTP Widget — client-side helper (Web SDK for custom UI).
// Docs: https://docs.msg91.com/otp-widget
//       https://msg91.com/help/how-to-integrate-the-new-login-with-otp-widget
//       (section: "How to configure Web SDK Custom UI in OTP widget?")
//
// How it works:
//  1. Load https://verify.msg91.com/otp-provider.js (fallback mirror phone91).
//  2. Call window.initSendOTP(configuration) with `exposeMethods: true`. This
//     hides the widget's own popup and exposes these methods on `window`:
//       - sendOtp(identifier, success, failure)
//       - retryOtp(channel, success, failure, reqId?)
//       - verifyOtp(otp, success, failure, reqId?)
//       - getWidgetData()
//       - isCaptchaVerified()
//  3. `captchaRenderId` points at a unique DOM element where the reCAPTCHA
//     renders (only used when exposeMethods is true).
//
// Note (from the docs): with `exposeMethods: true` the global success/failure
// callbacks in the config are NOT used — we listen to the per-method callbacks
// instead, which avoids double success/failure events.

const WIDGET_SCRIPT = 'https://verify.msg91.com/otp-provider.js';
const WIDGET_SCRIPT_FALLBACK = 'https://verify.phone91.com/otp-provider.js';

export const MSG91_WIDGET_ID = import.meta.env.VITE_MSG91_WIDGET_ID || '';
export const MSG91_AUTH_TOKEN = import.meta.env.VITE_MSG91_AUTH_TOKEN || '';

// Id of the DOM element MSG91 renders its captcha into. The element must exist
// **before** the widget loads and must stay mounted for the whole page session:
// MSG91 binds the captcha into it once at init and never re-binds. So it's
// rendered once at the app root (see App.jsx), never inside a route that can
// unmount (that was the cause of the post-logout "Send OTP" hang).
export const MSG91_CAPTCHA_RENDER_ID = 'msg91-captcha';

let scriptPromise = null;
let widgetInitPromise = null;

export const isMsg91Configured = () => Boolean(MSG91_WIDGET_ID && MSG91_AUTH_TOKEN);

const loadScript = (src) =>
  new Promise((resolve, reject) => {
    const el = document.createElement('script');
    el.src = src;
    el.async = true;
    el.type = 'text/javascript';
    el.onload = () => resolve();
    el.onerror = () => {
      el.remove();
      reject(new Error(`Failed to load MSG91 widget from ${src}`));
    };
    document.body.appendChild(el);
  });

// Loads otp-provider.js once (primary source, then fallback mirror).
export const loadMsg91Widget = () => {
  if (typeof window !== 'undefined' && typeof window.initSendOTP === 'function') {
    return Promise.resolve();
  }
  if (scriptPromise) return scriptPromise;
  scriptPromise = loadScript(WIDGET_SCRIPT)
    .catch(() => loadScript(WIDGET_SCRIPT_FALLBACK))
    .then(() => {
      if (typeof window.initSendOTP !== 'function') {
        throw new Error('MSG91 widget script loaded but initSendOTP is unavailable');
      }
    })
    .catch((err) => {
      scriptPromise = null; // allow a retry on the next attempt
      throw err;
    });
  return scriptPromise;
};

// After initSendOTP() the widget attaches sendOtp/verifyOtp to window
// asynchronously (it first fetches its configuration from MSG91). Poll until
// they appear.
const waitForExposedMethods = (timeout = 10000) =>
  new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const tick = () => {
      if (typeof window.sendOtp === 'function' && typeof window.verifyOtp === 'function') {
        resolve();
        return;
      }
      if (Date.now() - startedAt > timeout) {
        reject(new Error('MSG91 widget was not ready in time. Please try again.'));
        return;
      }
      setTimeout(tick, 100);
    };
    tick();
  });

/**
 * Initializes the widget exactly once for the lifetime of the page.
 *
 * MSG91 defines `window.sendOtp` / `verifyOtp` / `retryOtp` as non-writable,
 * non-configurable properties and skips redefining them if they already exist.
 * Calling `initSendOTP()` again removes the current widget element and creates a
 * new one, but the window globals keep pointing at the old (now destroyed)
 * instance — so a re-init would silently break every later OTP call. That's why
 * this promise is memoized and must never be reset while the page is alive.
 *
 * @param {{ captchaRenderId?: string }} [options]
 * @returns {Promise<object>} the widget configuration
 */
export const initMsg91Widget = (options = {}) => {
  if (!isMsg91Configured()) {
    return Promise.reject(
      new Error('MSG91 is not configured (missing VITE_MSG91_WIDGET_ID / VITE_MSG91_AUTH_TOKEN)')
    );
  }
  if (widgetInitPromise) return widgetInitPromise;

  widgetInitPromise = loadMsg91Widget()
    .then(async () => {
      const configuration = {
        widgetId: MSG91_WIDGET_ID,
        tokenAuth: MSG91_AUTH_TOKEN,
        exposeMethods: true,
        // Unique id of the element where MSG91 renders the captcha.
        captchaRenderId: options.captchaRenderId || '',
        // No-ops: with exposeMethods we consume the per-method callbacks so we
        // don't get duplicate success/failure events.
        success: () => {},
        failure: () => {},
      };

      window.configuration = configuration;
      window.initSendOTP(configuration);

      await waitForExposedMethods();

      if (import.meta.env.DEV) {
        try {
          // Helpful while debugging a widget's configuration.
          // eslint-disable-next-line no-console
          console.debug('MSG91 widget data:', window.getWidgetData?.());
        } catch (_) { /* ignore */ }
      }

      return configuration;
    })
    .catch((err) => {
      widgetInitPromise = null; // allow a retry on the next attempt
      throw err;
    });

  return widgetInitPromise;
};

export const isMsg91Initialized = () =>
  typeof window !== 'undefined' && typeof window.sendOtp === 'function';

const notReady = () => new Error('MSG91 widget is not ready yet. Please try again.');

// Wraps a callback-based widget method in a promise, with a safety timeout so
// the UI can never get stuck waiting on a callback that never fires.
const callWidgetMethod = (invoke, { timeoutMs = 30000, timeoutMessage = 'The request timed out. Please try again.' } = {}) =>
  new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error(timeoutMessage));
    }, timeoutMs);
    const ok = (data) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(data);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };
    invoke(ok, fail);
  });

/**
 * Sends an OTP to an identifier (mobile number / email with country code, no '+').
 * @param {string} identifier e.g. "919999999999"
 * @returns {Promise<any>} MSG91's send response (contains the reqId)
 */
export const sendMsg91Otp = (identifier) => {
  if (!isMsg91Initialized()) return Promise.reject(notReady());
  return callWidgetMethod(
    (ok, fail) => window.sendOtp(identifier, ok, fail),
    { timeoutMessage: 'Sending the OTP timed out. Please try again.' }
  );
};

/**
 * Returns the current widget configuration as provided by MSG91's API.
 * Useful to read OTP length, retry limits, whether captcha is enabled, etc.
 */
export const getMsg91WidgetData = () =>
  typeof window !== 'undefined' && typeof window.getWidgetData === 'function'
    ? window.getWidgetData()
    : null;

/**
 * Whether the widget's captcha has been solved.
 * @returns {boolean|null} null when the widget doesn't expose the method.
 */
export const isCaptchaVerified = () =>
  typeof window !== 'undefined' && typeof window.isCaptchaVerified === 'function'
    ? Boolean(window.isCaptchaVerified())
    : null;

// ── Response normalizers ─────────────────────────────────────────────────────

// Normalizes the reqId returned by sendOtp.
export const extractMsg91ReqId = (data) => {
  if (!data) return '';
  if (typeof data === 'string') return data;
  return data.reqId || data.requestId || data.message || '';
};

// Best-effort message extraction from the various error shapes MSG91 returns.
export const getMsg91ErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;
  return error.message || error.error || error.msg || fallback;
};

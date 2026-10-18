import axios from 'axios';
import logger from '../config/logger.js';

// MSG91 OTP Widget — server-side REST helpers.
// https://docs.msg91.com/otp-widget/send-otp
// https://docs.msg91.com/otp-widget/retry-otp
// https://docs.msg91.com/otp-widget/verify-otp
// https://docs.msg91.com/otp-widget/verify-access-token
//
// The OTP Widget is a "Custom" widget (widgetType "2"), so retrying an OTP
// requires an explicit retryChannel. SMS is channel 11.
const MSG91_WIDGET_BASE = 'https://control.msg91.com/api/v5/widget';

export const MSG91_RETRY_CHANNEL_SMS = 11;

const authkey = () => process.env.MSG91_AUTHKEY;
const widgetId = () => process.env.MSG91_WIDGET_ID;

export const isMsg91Configured = () =>
  Boolean(process.env.MSG91_AUTHKEY && process.env.MSG91_WIDGET_ID);

const widgetHeaders = () => ({
  authkey: authkey(),
  'Content-Type': 'application/json',
});

// MSG91 reports failures as { type: 'error', message: '...' } — and sometimes as
// a bare code like "IPBlocked". Turn those into errors that carry a friendly
// message, a machine-readable `code`, an HTTP `status`, and `expose: true` so a
// route can safely hand the message back to the client (never leaking internals).
const IP_BLOCK_MESSAGE =
  'Too many OTP requests. Please wait a couple of minutes and then try again.';

const looksLikeCode = (value) => /^[A-Za-z][A-Za-z0-9_-]*$/.test(String(value || '').trim());

const exposeError = (message, code, status = 400) =>
  Object.assign(new Error(message), { code, status, expose: true });

const msg91Failure = (data, fallback) => {
  const raw = typeof data?.message === 'string' ? data.message.trim() : '';
  const code = typeof data?.code === 'string' ? data.code.trim() : '';
  const hay = `${raw} ${code}`.toLowerCase();

  // IP is blocked (usually after too many OTP attempts from the same network).
  if (/ip[\s_-]?block/.test(hay) || hay.includes('too many otp')) {
    return exposeError(IP_BLOCK_MESSAGE, 'IP_BLOCKED', 429);
  }
  if (hay.includes('expire')) {
    return exposeError('That code has expired. Please request a new one.', 'OTP_EXPIRED', 400);
  }
  if (/invalid otp|otp not|not match|incorrect|wrong otp/.test(hay)) {
    return exposeError('That code is incorrect. Please check and try again.', 'INVALID_OTP', 400);
  }
  // Bare codes (e.g. "NumberBlocked") aren't user-friendly — use the fallback.
  const message = raw && !looksLikeCode(raw) ? raw : fallback;
  return exposeError(message, 'MSG91_ERROR', 400);
};

// Wraps an axios call to MSG91 so network/timeout errors also become friendly,
// client-safe failures instead of leaking axios internals.
const postWidget = async (path, body, fallback) => {
  try {
    const { data } = await axios.post(`${MSG91_WIDGET_BASE}/${path}`, body, {
      headers: widgetHeaders(),
      timeout: 10000,
    });
    return data;
  } catch (error) {
    if (error?.expose) throw error;
    logger.warn('MSG91 request failed', { path, error: error?.message });
    throw exposeError(fallback, 'MSG91_UNAVAILABLE', 503);
  }
};

/**
 * Resends the OTP for an existing request on the given channel.
 * The retry channel is mandatory because the widget is a Custom widget.
 *
 * @param {string} reqId - request id returned when the OTP was sent
 * @param {number} [retryChannel] - MSG91 channel id (11 = SMS)
 * @returns {Promise<{ reqId: string, raw: object }>}
 */
export const retryOtp = async (reqId, retryChannel = MSG91_RETRY_CHANNEL_SMS) => {
  if (!authkey() || !widgetId()) throw new Error('MSG91 not configured on server');
  if (!reqId) throw new Error('reqId is required');

  const fallback = 'We could not resend the OTP right now. Please try again in a moment.';
  const data = await postWidget('retryOtp', { widgetId: widgetId(), reqId, retryChannel }, fallback);

  if (!data || data.type !== 'success') {
    logger.warn('MSG91 retryOtp failed', { response: data });
    throw msg91Failure(data, fallback);
  }

  // On success MSG91 returns { type: 'success', message: '<new reqId>' }
  return { reqId: data.message || reqId, raw: data };
};

/**
 * Verifies a user-entered OTP server-side and returns the JWT access token.
 *
 * @param {string} reqId - request id returned when the OTP was sent
 * @param {string} otp - the OTP entered by the user
 * @returns {Promise<string>} the JWT access token
 */
export const verifyOtp = async (reqId, otp) => {
  if (!authkey() || !widgetId()) throw new Error('MSG91 not configured on server');
  if (!reqId || !otp) throw new Error('reqId and otp are required');

  const fallback = 'That code is incorrect or has expired. Please check and try again.';
  const data = await postWidget('verifyOtp', { widgetId: widgetId(), reqId, otp: String(otp) }, fallback);

  if (!data || data.type !== 'success') {
    logger.warn('MSG91 verifyOtp failed', { response: data });
    throw msg91Failure(data, fallback);
  }

  const accessToken =
    data['access-token'] || data.accessToken || data.access_token || data.token || data.message;

  if (!accessToken) {
    throw new Error('MSG91 did not return an access token');
  }

  return accessToken;
};

/**
 * Validates an access token obtained after a successful widget OTP verification.
 * Returns the verified identifier (mobile number or email) that MSG91 confirms.
 *
 * @param {string} accessToken - JWT access token returned by the OTP widget
 * @returns {Promise<{ identifier: string, raw: object }>}
 */
export const verifyAccessToken = async (accessToken) => {
  if (!authkey()) {
    throw new Error('MSG91 not configured on server');
  }
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  const fallback = 'We could not verify your phone number. Please try again.';
  const data = await postWidget(
    'verifyAccessToken',
    { authkey: authkey(), 'access-token': accessToken },
    fallback
  );

  if (!data || data.type !== 'success') {
    logger.warn('MSG91 access token verification failed', { response: data });
    throw msg91Failure(data, fallback);
  }

  // On success MSG91 returns { type: 'success', message: '<identifier>' }
  // where identifier is the verified mobile number / email.
  return { identifier: data.message, raw: data };
};

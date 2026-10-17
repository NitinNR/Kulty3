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

  const { data } = await axios.post(
    `${MSG91_WIDGET_BASE}/retryOtp`,
    { widgetId: widgetId(), reqId, retryChannel },
    { headers: widgetHeaders(), timeout: 10000 }
  );

  if (!data || data.type !== 'success') {
    logger.warn('MSG91 retryOtp failed', { response: data });
    throw new Error(data?.message || 'MSG91 could not resend the OTP');
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

  const { data } = await axios.post(
    `${MSG91_WIDGET_BASE}/verifyOtp`,
    { widgetId: widgetId(), reqId, otp: String(otp) },
    { headers: widgetHeaders(), timeout: 10000 }
  );

  if (!data || data.type !== 'success') {
    logger.warn('MSG91 verifyOtp failed', { response: data });
    throw new Error(data?.message || 'Invalid OTP');
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

  const { data } = await axios.post(
    `${MSG91_WIDGET_BASE}/verifyAccessToken`,
    { authkey: authkey(), 'access-token': accessToken },
    {
      headers: widgetHeaders(),
      timeout: 10000,
    }
  );

  if (!data || data.type !== 'success') {
    logger.warn('MSG91 access token verification failed', { response: data });
    throw new Error(data?.message || 'MSG91 access token verification failed');
  }

  // On success MSG91 returns { type: 'success', message: '<identifier>' }
  // where identifier is the verified mobile number / email.
  return { identifier: data.message, raw: data };
};

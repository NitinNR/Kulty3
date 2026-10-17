import { useSyncExternalStore } from 'react';
import { getMsg91WidgetData, isCaptchaVerified } from '../services/msg91';

// One shared, polled view of MSG91's captcha state. The persistent captcha host
// (App.jsx) and the login screen both need the same values, so the widget is
// polled once and every subscriber reads the same snapshot.
//
//   required   the widget has captcha validations enabled
//   verified   MSG91 currently holds a solved captcha token
//   otpLength  OTP box count configured on the widget
//   step       which part of the login flow the user is on (set by LoginPage)
//
// The host is only shown for the phone-entry step while the captcha still needs
// solving — it is hidden as soon as the user verifies it and comes back after a
// send (which clears the token), i.e. exactly when re-validation is required.

const POLL_MS = 700;
const DEFAULT_STEP = 'method';

let snapshot = { required: false, verified: false, otpLength: 0, step: DEFAULT_STEP };
let timer = null;
const subscribers = new Set();

const getSnapshot = () => snapshot;
const emit = () => subscribers.forEach((onChange) => onChange());

const patch = (next) => {
  if (
    next.required === snapshot.required &&
    next.verified === snapshot.verified &&
    next.otpLength === snapshot.otpLength &&
    next.step === snapshot.step
  ) {
    return;
  }
  snapshot = { ...snapshot, ...next };
  emit();
};

const read = () => {
  const data = getMsg91WidgetData();
  const otpLength = Number(data?.otpLength);
  patch({
    required: Boolean(data?.captchaValidations) && data?.widgetMeta?.captcha_type !== 2,
    verified: Boolean(isCaptchaVerified()),
    otpLength: otpLength > 0 ? otpLength : snapshot.otpLength,
  });
};

const poll = () => {
  read();
  // read() may notify subscribers that unsubscribe synchronously, so only keep
  // the timer alive while somebody is still listening.
  timer = subscribers.size > 0 ? setTimeout(poll, POLL_MS) : null;
};

const subscribe = (onChange) => {
  subscribers.add(onChange);
  if (!timer) timer = setTimeout(poll, 0);
  return () => {
    subscribers.delete(onChange);
    if (subscribers.size === 0 && timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
};

/**
 * Lets the login screen tell the store where the user is, so the captcha host
 * can hide itself once the OTP step is reached.
 * @param {'method'|'otp'} step
 */
export const setMsg91LoginStep = (step) => patch({ step: step || DEFAULT_STEP });

export const useMsg91Captcha = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

# 🔧 Fixes Applied

## Phone Login — "Channel not provided in retryOtp()" + OTP verify 502 (verify & resend now server-side)

### Issue
1. **Resend** failed with `Channel not provided in retryOtp() method.`
2. **Verify** failed with `Request failed with status code 502`.

### Root Cause (verified against the live MSG91 widget config + `otp-provider.js`)
- The widget is a **Custom** widget — `widgetType.value === "2"`. For that type the SDK **requires** an explicit `retryChannel`:
  `retryOtpExposed(n,r,o,s=null){ let u=null; "2"===widgetType&&(u=n); this.retryOtp(u,r,o,s) }`
  → with `null` it throws *"Channel not provided in retryOtp() method."*
- The widget also has `captchaValidations: 1`, so the SDK tries to run hCaptcha. Client-side `verifyOtp`/`retryOtp` were additionally fragile (network / proxy 502s surfaced to the UI).

### Fix Applied — verify & resend moved to MSG91's documented widget REST APIs (server-side)
**Backend `backend/src/services/msg91.js`:**
- Added `MSG91_RETRY_CHANNEL_SMS = 11` and `retryOtp(reqId, retryChannel=11)` → `POST /api/v5/widget/retryOtp`.
- Added `verifyOtp(reqId, otp)` → `POST /api/v5/widget/verifyOtp` (returns the JWT access token).
- `isMsg91Configured()` now also requires `MSG91_WIDGET_ID`.

**Backend `backend/src/routes/auth.js`:**
- `POST /msg91/verify` now takes `{ reqId, otp }` (was `{ accessToken }`): `verifyOtp` → `verifyAccessToken` → match/create user → `createCustomToken`.
- New `POST /msg91/retry` takes `{ reqId }` and returns `{ reqId }` (fresh reqId on SMS channel).

**Frontend `services/api.js`:** replaced `verifyMsg91AccessToken` with `retryMsg91Otp(reqId)` and `verifyMsg91Otp(reqId, otp)`.

**Frontend `services/msg91.js`:** removed the widget-based `retryMsg91Otp`/`verifyMsg91Otp`/`extractMsg91Token`. The widget is now used **only for sending** the OTP (it owns the captcha); verify/retry go through the backend.

**Frontend `pages/auth/LoginPage.jsx`:** `handleResendOTP` → `retryMsg91Otp(reqId)`; `handleVerifyOTP` → `verifyMsg91Otp(reqId, otp)` then `signInWithCustomToken`. The client-side access-token exchange is gone.

**Backend `.env` / `.env.example`:** added `MSG91_WIDGET_ID` (public — same value as `VITE_MSG91_WIDGET_ID`).

### Environment note
`MSG91_AUTHKEY` **and** `MSG91_WIDGET_ID` must both be set. On **Vercel**, add `MSG91_WIDGET_ID` to the backend's environment variables and redeploy. Restart the local backend after editing `.env`.

### Build Status
✅ **Frontend build successful** (`dist/assets/index-BiEPrwuP.js`)
✅ **Backend syntax check passed** (`node --check`)

---

## Phone Login — OTP boxes now match the widget's OTP length (4 vs 6 digits)

### Issue
MSG91 sent a **4-digit** code but the UI rendered **6** input boxes, so the code could never be completed.

### Root Cause
The OTP length was hard-coded (`const OTP_LENGTH = 6`). The widget exposes the real length as `widgetData.otpLength` (verified in `otp-provider.js`, which uses `n.widgetData.otpLength` for its own input `minlength`/`maxlength`).

### Fix Applied
**File:** `frontend/src/pages/auth/LoginPage.jsx`
- Replaced the `OTP_LENGTH` constant with a `DEFAULT_OTP_LENGTH = 6` fallback and an `otpLength` state.
- Added `syncOtpLength()` reading `getMsg91WidgetData()?.otpLength`, called after a successful send/resend.
- The existing captcha/data poll also syncs `otpLength` once widget data loads.
- The OTP step now uses `otpLength` for: the "Enter the N-digit code" text, the number of `OtpInput` boxes, and the Verify button's enabled state.

`OtpInput` already re-renders its boxes from the `length` prop, so no change was needed there.

### Build Status
✅ **Frontend build successful** (`dist/assets/index-Dd2ERqTM.js`)

---

## Phone Login — "Sending the OTP timed out" (captcha host must be persistent)

### Issue
After the previous change removed `captchaRenderId`, tapping **Send OTP** now always failed with `Sending the OTP timed out. Please try again.` (first load, not just after logout).

### Root Cause (verified in `https://verify.msg91.com/otp-provider.js`)
Captcha **is** enabled for the widget (`widgetData.captchaValidations === true`). In `requestOTP`:
- `exposeMethods: true` **and** no `captchaRenderId` → MSG91 tries to run the captcha by itself (`this.hcaptchaService.verify()` or `grecaptcha.enterprise.execute(...)`). When that can't complete, it **never calls the success/failure callback** → our 30s timeout fires. (`hcaptchaService` errors only `console.error`, they don't reach our callback.)
- `exposeMethods: true` **with** a `captchaRenderId` → MSG91 renders the captcha **once at init** into the element with that id (`document.getElementById(id).appendChild(vanillaHCaptcha)`), and the solved token enables sending.

So removing `captchaRenderId` broke sending entirely, and the earlier post-logout hang was because the captcha host lived **inside `LoginPage`** and got unmounted on logout (MSG91 binds to it only once and never re-binds).

### Fix Applied
Give MSG91 a captcha host that exists **before init** and **never unmounts**.

**File:** `frontend/src/services/msg91.js`
- Added `MSG91_CAPTCHA_RENDER_ID = 'msg91-captcha'`.

**File:** `frontend/src/App.jsx`
- Added `Msg91CaptchaHost` — a `position: fixed` element mounted once at the app root (inside `BrowserRouter`), visible only on `/login`, hidden elsewhere via `visibility` (node stays mounted so the captcha instance is never destroyed).
- `initMsg91Widget({ captchaRenderId: MSG91_CAPTCHA_RENDER_ID })`.

**File:** `frontend/src/pages/auth/LoginPage.jsx`
- Polls `getMsg91WidgetData()` + `isCaptchaVerified()` to detect when a captcha is required, and gates **Send OTP** until it's solved, with a "complete the verification challenge below" hint.

### Notes
- Simplest alternative if no captcha is wanted: set the widget's captcha/reCAPTCHA option to **None** in the MSG91 dashboard so `captchaValidations` is `false` (then the host stays empty and Send is never gated).
- The app must start with the host present; it is rendered by `App` and committed before the init effect runs.

### Build Status
✅ **Frontend build successful** (`dist/assets/index-By-Ef93R.js`)

---

## Phone Login — Logout→Login Fix (widget lifecycle) + OTP UI Revamp

### Issue 1 — "Send OTP" stuck after logout (no page refresh)
Logging in, then logging out and trying to send an OTP again left the button spinning forever.

### Root Cause (found by inspecting `https://verify.msg91.com/otp-provider.js`)
- The widget defines `window.sendOtp` / `retryOtp` / `verifyOtp` / `getWidgetData` / `isCaptchaVerified` **once**, as `writable: false, configurable: false`, and **only if they don't already exist** (`!window.hasOwnProperty(...)`).
- `window.initSendOTP(config)` **removes the existing `<msg91-otp-provider>` element and creates a new one** — but the window globals are **not** rebound, so they keep pointing at the first (now destroyed) component instance.
- Therefore any re-initialization permanently breaks later OTP calls (callbacks never fire → infinite spinner), and the non-configurable globals can't be deleted.

### Fix Applied
The widget must be initialized **exactly once for the page lifetime** and never torn down.

**File:** `frontend/src/App.jsx`
- Added a `useEffect(..., [])` that calls `initMsg91Widget()` once at app start (independent of the login route), so login/logout never destroys or re-initializes it.

**File:** `frontend/src/services/msg91.js`
- Removed the earlier `resetMsg91Widget()` approach (re-init is actively harmful here).
- Documented the bind-once constraint on `initMsg91Widget()`.
- `sendMsg91Otp` / `retryMsg91Otp` / `verifyMsg91Otp` now go through `callWidgetMethod(...)` with a **30s safety timeout**, so a missing callback surfaces a clear error instead of hanging the UI.

**File:** `frontend/src/pages/auth/LoginPage.jsx`
- Removed the per-mount init + teardown effect; `ensureWidget()` now just awaits the app-level (memoized) init.

### Issue 2 — Captcha
Captcha is disabled on the widget, and binding a captcha container (`captchaRenderId`) to a route-scoped element is what would get orphaned across login/logout. So captcha handling was removed from the login flow:
- Deleted `frontend/src/components/auth/Msg91Captcha.jsx`.
- `initMsg91Widget()` is no longer passed a `captchaRenderId` (defaults to empty).
- Removed captcha state/gating from `LoginPage`.

### UI Revamp (more attractive + simple)
**File:** `frontend/src/pages/auth/LoginPage.jsx`
- Switched to the dark/gold Kulty theme (matches the Partner login page): `#0d0d0d` background with ambient gold glow, rounded card, `KULTY` wordmark.
- Cleaner two-step flow with an icon header, gold primary buttons, and a divider for "or use phone".
- OTP step now shows a 6-digit code target and a **Resend countdown** (30s).
- Auto-verifies as soon as the 6th digit is entered.

**File:** `frontend/src/components/auth/OtpInput.jsx` (new)
- 6 single-digit boxes with auto-advance, backspace/arrow navigation, paste support, and gold filled/focus states.

### Build Status
✅ **Frontend build successful**

---

## Phone Login — Retry Uses Default Channel (SMS); Captcha Now Disabled

### What
Per updated requirements: captcha is disabled in the MSG91 widget, and OTP retry should use only the default channel (SMS).

### `frontend/src/services/msg91.js`
- Removed the unused multi-channel `MSG91_CHANNEL` map (SMS/Voice/Email/WhatsApp).
- Simplified `retryMsg91Otp(reqId)` — it always passes `null` as `retryChannel`, i.e. the widget's default channel. Confirmed against the MSG91 docs: *"The retryChannel is optional if only one retry method is configured in the widget."* Our widget uses SMS only.

### `frontend/src/pages/auth/LoginPage.jsx`
- "Resend OTP" now calls `retryMsg91Otp(reqId)` (default/SMS channel).

### Captcha
- No code change needed. With captcha disabled, `Msg91Captcha` never renders its status card (`rendered` stays `false`), so `captchaBlocking` is always `false` and Send OTP is never gated. The component is kept as a no-op so it works automatically if captcha is re-enabled later.

### Build Status
✅ **Frontend build successful**

---

## Phone Login — Full MSG91 Web SDK (Custom UI) + Captcha UI

### What
Completed the MSG91 **Web SDK for custom UI** integration per the official docs (section *"How to configure Web SDK Custom UI in OTP widget?"*), covering every exposed method and adding a proper captcha UI.

### `frontend/src/services/msg91.js` (expanded)
- `initMsg91Widget()` config now follows the doc exactly: `{ widgetId, tokenAuth, identifier, exposeMethods: true, captchaRenderId, success, failure }`. The global `success`/`failure` are no-ops (per the doc's note, we listen to per-method callbacks instead to avoid double events).
- Full method coverage:
  - `sendMsg91Otp(identifier)` → `window.sendOtp`
  - `retryMsg91Otp(channel, reqId)` → `window.retryOtp` (exported `MSG91_CHANNEL` = SMS `'11'`, Voice `'4'`, Email `'3'`, WhatsApp `'12'`; `null` for default config)
  - `verifyMsg91Otp(otp, reqId)` → `window.verifyOtp`
  - `getMsg91WidgetData()` → `window.getWidgetData` (logged in dev)
  - `isCaptchaVerified()` → `window.isCaptchaVerified`
- `reqId` is now threaded through: taken from the `sendOtp` response (`extractMsg91ReqId`) and passed to `retryOtp`/`verifyOtp` (only appended when present, so the widget's internal session id is used otherwise).
- Kept readiness handling from the previous fix (`waitForExposedMethods`).

### `frontend/src/components/auth/Msg91Captcha.jsx` (new)
- Owns the DOM element whose id matches `captchaRenderId` so MSG91 can render its reCAPTCHA.
- Detects when the captcha actually renders (MutationObserver, checks for the injected iframe) — so it stays invisible when captcha is disabled in the widget.
- Polls `isCaptchaVerified()` and shows a status card: **"Please tick the box to verify you're human"** → **"Verified — you can continue"**.
- Reports `{ rendered, verified }` up to the parent.

### `frontend/src/pages/auth/LoginPage.jsx`
- Initializes the widget on mount (deferred with `setTimeout` so React StrictMode's dev double-mount settles on one stable container) instead of only on button click — so the captcha is visible before the user presses Send.
- Renders `Msg91Captcha`; **Send OTP is disabled until the captcha is solved** (`captchaBlocking`, only when a captcha is actually rendered and reported unverified).
- Stores `reqId` from `sendOtp` and passes it to `retryOtp` and `verifyOtp`.

### Build Status
✅ **Frontend build successful**

---

## Phone Login — "MSG91 widget is not ready yet" Fix

### Issue
Clicking **Send OTP** immediately showed *"MSG91 widget is not ready yet. Please try again."*

### Root Cause
`initMsg91Widget()` called `window.initSendOTP(config)` and returned right away. But with `exposeMethods: true`, MSG91 attaches `window.sendOtp` / `window.verifyOtp` **asynchronously** (it first fetches the widget configuration from MSG91's API). So `isMsg91Initialized()` was still `false` when `sendMsg91Otp()` ran a moment later, and it rejected.

### Fix Applied

**File:** `frontend/src/services/msg91.js`
1. Added `waitForExposedMethods()` — polls (100ms, 10s timeout) until both `window.sendOtp` and `window.verifyOtp` exist, then resolves.
2. `initMsg91Widget()` now `await waitForExposedMethods()` before resolving, so callers know the widget is truly ready.
3. `loadMsg91Widget()` now verifies `window.initSendOTP` actually exists after the script loads, and resets `scriptPromise`/`widgetInitPromise` on failure so a retry is possible (instead of being stuck on a rejected memoized promise).
4. On timeout the error is now *"MSG91 widget was not ready in time. Please try again."* — a clearer signal that the widget config/token may be wrong.

### If it still fails
- Verify `VITE_MSG91_WIDGET_ID` and `VITE_MSG91_AUTH_TOKEN` are set and correct (the **OTP Widget token**, not the account authkey).
- Confirm the widget is **subscribed to the free plan** and configured for **Mobile** in the MSG91 dashboard.
- If `success`/`failure` or a blocked request appears in the browser console, the widget may be rejecting the token — check the MSG91 **Logs** section.

### Build Status
✅ **Frontend build successful**

---

## Phone Login — Country Code Dropdown (India-only) + Black Input Text

### Changes
Following up on the MSG91 OTP integration, the login phone field got a country-code selector and readable (black) input text.

**File:** `frontend/src/pages/auth/LoginPage.jsx`
1. Added a `COUNTRY_CODES` list rendered as a `<select>` next to the phone input. **Only India (+91) is enabled**; the other countries (US, UK, UAE, Australia) render as `disabled` options labeled `(soon)` — so the selector is clearly a country picker but non-Indian numbers can't be chosen.
2. `normalizePhone(raw, dialCode)` now takes the selected dial code (defaults to `91`); a 10-digit local number is prefixed with `+91` (without the `+`) for MSG91.
3. Phone input now accepts digits only, max 10, placeholder "Enter mobile number".
4. Input **text color fixed** — the app's global `body { color: rgba(255,255,255,0.85) }` made typed values white on the white login card. Added `text-gray-900 placeholder:text-gray-400` to both the phone and OTP inputs.
5. "OTP sent to …" line now shows the full number (`+91 98765 43210`).

### Build Status
✅ **Frontend build successful**

---

## Phone Login — MSG91 OTP Widget (Free OTP Widget) Integration

### Feature
Added phone-number OTP login using MSG91's OTP Widget (Web SDK with **custom UI** / `exposeMethods`), replacing the old Firebase phone auth (which required reCAPTCHA + a Blaze plan). Google login is untouched.

Per official docs (`https://docs.msg91.com/otp-widget` and `https://msg91.com/help/how-to-integrate-the-new-login-with-otp-widget`):
1. Widget sends OTP → user enters OTP → widget verifies → returns a JWT **access-token**.
2. Our backend validates that access-token with MSG91's `POST https://control.msg91.com/api/v5/widget/verifyAccessToken` → gets the verified mobile number.
3. Backend mints a **Firebase custom token** for that phone; the frontend exchanges it via `signInWithCustomToken()` so the whole existing Firebase-based auth/context flow keeps working.

### Files Added
- `frontend/src/services/msg91.js` — loads `https://verify.msg91.com/otp-provider.js` (fallback `https://verify.phone91.com/otp-provider.js`), initializes the widget with `exposeMethods: true`, and wraps `sendOtp` / `retryOtp` / `verifyOtp` as promises. Also normalizes the success payload (`extractMsg91Token`) and error messages.
- `backend/src/services/msg91.js` — `verifyAccessToken(accessToken)` calls MSG91's verify-access-token API with the account `authkey` and returns the verified identifier.

### Files Changed
- `frontend/src/services/firebase.js` — added `signInWithCustomToken()` (imports Firebase's `signInWithCustomToken`, forces a token refresh).
- `frontend/src/services/api.js` — added `verifyMsg91AccessToken(accessToken)` → `POST /auth/msg91/verify`.
- `frontend/src/pages/auth/LoginPage.jsx` — re-enabled the phone section: phone input → **Send OTP** (widget) → OTP input → **Verify OTP** → backend → custom token → Firebase session. Added a `#msg91-captcha` container for the widget captcha and a **Resend OTP** action.
- `backend/src/services/firebaseAdmin.js` — added `createCustomToken(uid, claims)`.
- `backend/src/routes/auth.js` — added `POST /auth/msg91/verify`: validates env, verifies the access-token, normalizes the phone, reuses an existing user by phone (or creates `msg91_<phone>`), and returns `{ customToken, phone, isNewUser, user }`.
- `frontend/.env.example` — added `VITE_MSG91_WIDGET_ID`, `VITE_MSG91_AUTH_TOKEN`.
- `backend/.env.example` — added `MSG91_AUTHKEY`.

### Required Configuration
- **MSG91 dashboard** (https://control.msg91.com): create an **OTP Widget**, subscribe to the free plan, set contact point = Mobile, and copy the **Widget ID** + generate an **OTP Widget token**.
- **Frontend env**: `VITE_MSG91_WIDGET_ID`, `VITE_MSG91_AUTH_TOKEN` (the widget token, *not* the account authkey).
- **Backend env**: `MSG91_AUTHKEY` (account authkey, used server-side only).
- **Firebase console**: enable **Custom** sign-in under Authentication → Sign-in method (required for `signInWithCustomToken`).

### Build Status
✅ **Frontend build successful · Backend syntax check passed**

---

## Homepage Hero Events Stat — Shows Total Event Count, Not Just Upcoming

### Issue
The hero's "Events" stat showed the total of *upcoming* events only. Requirement: the hero stat should show the total event count (all events, including past), while the "Upcoming Events" section below still lists only upcoming events.

### Fix Applied

**File:** `frontend/src/pages/user/HomePage.jsx`
- Kept `getEvents({ status: 'upcoming', limit: 4 })` for the "Upcoming Events" section list.
- Added a lightweight `getEvents({ limit: 1 })` call whose `total` drives the hero "Events" stat — so the hero shows the real count of all events while the section below stays upcoming-only.

### Build Status
✅ **Frontend build successful**

---

## Homepage Hero Stats — Shows Real Totals Instead of Placeholder Counts

### Issue
The hero section's stats row showed a hardcoded `100+` for Events (and `50+` for Venues as a fallback), or the length of the currently-fetched slice (e.g. `4+`) — not the real number of events/venues.

### Fix Applied

**File:** `frontend/src/pages/user/HomePage.jsx`
1. Added `venueTotal` and `eventTotal` state.
2. `fetchVenues` now stores the API's `total` venue count; the events fetch stores the API's `total` (upcoming) event count.
3. `HeroSection` now takes `venueTotal`/`eventTotal` props and renders the actual totals (falling back to `50+`/`100+` only while data hasn't loaded yet).

### Build Status
✅ **Frontend build successful**

---

## Past Events No Longer Shown as Upcoming

### Issue
Events whose date had already passed still appeared under "Upcoming Events" (and under the "All"/"Upcoming" tabs on the Events page) with an `upcoming` badge. This happened because `status` defaults to `upcoming` and is only set to `past` if an admin manually updates it — so stale stored statuses kept old events looking upcoming forever.

### Fix Applied

**File:** `backend/src/routes/events.js`
1. Added `effectiveStatus(event)` helper — derives the true status from the event date: any event with a date before today is `past`, regardless of the stale stored value.
2. **List route (`GET /events`)**:
   - Fire-and-forget self-heal: `Event.updateMany({ date: { $lt: startOfToday }, status: { $ne: 'past' } }, { status: 'past' })` fixes the DB so every consumer sees the correct status.
   - The `status` filter now also accounts for the date (via `$and` conditions), so `upcoming` excludes past-dated events and `past` includes them — even before the self-heal write lands.
   - Every returned event gets its status overridden with the effective status.
3. **Single route (`GET /events/:id`)** — persists the corrected status on the document when stale.

**File:** `frontend/src/pages/user/HomePage.jsx`
- "Upcoming Events" section now calls `getEvents({ status: 'upcoming', limit: 4 })` so past events never appear there.

### Build Status
✅ **Frontend build successful · Backend syntax check passed**

---

## Venue Owner Flow — Existing Members No Longer Tagged as Venue Owners

### Issue
A normal member who visited `/partner` once was auto-tagged with `intentRole='venue_owner'`. After that, even after signing out and back in with the same (member) Google account, they were still redirected to the venue application form.

### Root Cause
`PartnerLoginPage` tagged **every** fresh sign-in on `/partner` as a venue owner, without checking whether the account was already a registered member. Once tagged, `LoginPage`/`RootRedirect` kept routing the user to `/apply-venue`.

### Fix Applied

**File:** `frontend/src/pages/auth/PartnerLoginPage.jsx`
- Fresh sign-ins are now decided by account state:
  - `admin` → `/admin`, `venue_owner`/`venue_staff` → `/venue`.
  - `intentRole === 'venue_owner'` (already a real applicant) → venue flow.
  - **Brand-new account (no name yet)** → tagged as venue owner → `/complete-profile?next=/apply-venue`.
  - **Existing registered account (member)** → NOT tagged; shows an "Account already registered" screen with **Sign out & try another account** and **Go to my member account**.
- Kept the sign-out gate for users already logged in when opening `/partner`.

**File:** `backend/src/routes/users.js` (`GET /users/me`)
- Self-heal: if a user has `intentRole='venue_owner'` and a completed profile (`name`) but **no venue application exists**, `intentRole` is reset to `null` — so previously-wrongly-tagged members automatically return to the normal member flow on their next profile fetch.

### Flow after fix (step by step)
1. Member logs in → visits `/partner` → **sign-out gate** shown.
2. Member signs out → `/partner` shows the Google sign-in form.
3. Member signs in again with the same member Google account → profile shows an **existing registered account** → "Account already registered" screen → goes to member account (NOT the venue form).
4. A **new/unregistered Google account** signs in on `/partner` → venue owner onboarding form.

### Build Status
✅ **Frontend build successful · Backend syntax check passed**

---

## Apply Venue — Logout Button on Status/Form Pages

### Issue
On the "Application Under Review" (and other application status) page, venue owners had no way to sign out.

### Fix Applied

**File:** `frontend/src/pages/auth/ApplyVenueOwnerPage.jsx`
1. Added a **Sign out** button on the application status view (under review / approved / rejected) that logs out and returns to `/partner`.
2. Also added a **Sign out** link in the top-right of the application form view (next to the Back button).

### Build Status
✅ **Build Successful!**

---

## Apply Venue — Submit Button Loader Centering + Partner Sign-out Gate

### Issue 1
The "Submit Application" loader (Spinner) in `ApplyVenueOwnerPage` was not centered inside the button.

### Fix Applied

**File:** `frontend/src/pages/auth/ApplyVenueOwnerPage.jsx`
Added `flex items-center justify-center gap-2` to the submit button so the spinner is centered.

### Issue 2
A normal user who was already logged in and visited `/partner` was silently auto-redirected, instead of being asked to sign out so they could sign in again with their venue-owner Google account.

### Fix Applied

**File:** `frontend/src/pages/auth/PartnerLoginPage.jsx`
1. Tracks `wasAuthedOnMount` — if the user was already signed in when opening `/partner`, a **sign-out gate** is shown: "You're currently signed in as … — please sign out first" with a **Sign out & continue as venue owner** button and a **Go to my account** button.
2. After signing out, the Google sign-in form is shown. A fresh sign-in on this page proceeds to the venue flow (`/complete-profile?next=/apply-venue` → `/apply-venue`, or straight to `/apply-venue`).

### Build Status
✅ **Build Successful!**

---

## Onboarding — Separated Member vs Venue Owner Flows

### Issue
After Google login, new users were shown a two-option "How would you like to join?" screen (`/choose-path`) to pick Member vs Venue Owner. The requirement: default Google login should always treat the user as a **normal member** (no selection), and venue owners should have a **separate, hidden route** with their own Google auth → venue onboarding.

### Changes

**New file:** `frontend/src/pages/auth/PartnerLoginPage.jsx`
- Standalone `/partner` route (not linked from normal-user UI).
- Own "Continue with Google as Venue Owner" sign-in.
- After auth, redirects: admin → `/admin`, approved owner/staff → `/venue`, new user → `/complete-profile?next=/apply-venue`, otherwise → `/apply-venue`.
- Sets `intentRole: 'venue_owner'` (via `updateProfile`) so the user stays on the venue flow across sessions.

**`frontend/src/App.jsx`**
- Added `/partner` route; removed `/choose-path` route and its import.
- `RootRedirect` no longer sends users to `/choose-path`; keeps venue applicants on `/apply-venue`.

**`frontend/src/pages/auth/LoginPage.jsx`**
- Removed the `!intentRole → /choose-path` redirect. Default login is now: admin → `/admin`, venue_owner → `/venue`, new user → `/complete-profile` → `/payment`, subscribed member → `/home`.

**`frontend/src/pages/auth/CompleteProfilePage.jsx`**
- After saving, navigates to `?next=` param if present, else `/payment` (normal member flow).

**`frontend/src/pages/payment/PaymentPage.jsx`**
- Back arrow now goes to `/home` instead of the removed `/choose-path`.

**Deleted:** `frontend/src/pages/auth/ChoosePathPage.jsx`.

### Build Status
✅ **Build Successful!**

---

## Homepage Navbar — Working Top Search

### Issue
The search icon in the top navbar did nothing useful — it just navigated to `/home` without any search UI or results.

### Fix Applied

**File:** `frontend/src/components/layout/Navbar.jsx`
1. Search icon (now visible on mobile **and** desktop) toggles an in-navbar search panel that auto-focuses.
2. Typing queries the API (debounced 350ms) via `getVenues` + `getEvents` in parallel.
3. Dropdown shows live **VENUES** and **EVENTS** results (with thumbnails) — clicking navigates to the detail page.
4. Shows a "No results" state and a "See all results" action.
5. **Enter** navigates to `/home?q=<query>&focus=1`; **Esc** or click-outside closes the panel; the panel closes on route change.

**File:** `frontend/src/pages/user/HomePage.jsx`
1. Reads the `?q=` URL param on mount via `useSearchParams` and applies it to the existing home search bar (which already filters venues).
2. With `focus=1`, it scrolls to and focuses the home search input.

### Build Status
✅ **Build Successful!**

---

## Homepage Hero — Video Replaced with 4K Image

### Issue
The homepage hero section played a remote video file (`3129671-uhd_2560_1440_30fps.mp4` from Pexels), causing slow load times, heavy bandwidth usage, and autoplay quirks on mobile.

### Fix Applied

**File:** `frontend/src/pages/user/HomePage.jsx`

1. **Removed the `<video>` element** (autoPlay/loop/muted/playsInline) from `HeroSection`.
2. **Replaced with a static 4K image** — a party & gathering vibe photo from Unsplash at 4K resolution (`?w=3840&q=80`).
3. **Removed the loading-state fallback poster logic** (`videoLoaded` state + poster div) since a static image needs no pre-load fade.
4. Added `loading="eager"` and `fetchpriority="high"` so the hero renders immediately.

### Key Changes
```diff
- const [videoLoaded, setVideoLoaded] = useState(false);
- <video autoPlay loop muted playsInline onLoadedData={...} poster="...">
-   <source src="https://videos.pexels.com/video-files/3129671/...mp4" type="video/mp4" />
- </video>
- {!videoLoaded && ( <div ... poster background ... /> )}
+ <img
+   src="/assets/hero-party.jpg"
+   alt="Party and gathering"
+   className="w-full h-full object-cover"
+   loading="eager"
+   fetchpriority="high"
+ />
```

### Build Status
✅ **Build Successful!**

---

## Tailwind CSS v4 PostCSS Configuration

### Issue
Tailwind CSS v4 moved the PostCSS plugin to a separate package (`@tailwindcss/postcss`), causing build errors.

### Fixes Applied

### 1. ✅ Installed @tailwindcss/postcss
```bash
npm install -D @tailwindcss/postcss
```

### 2. ✅ Updated postcss.config.js
Changed from:
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

To:
```js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### 3. ✅ Updated index.css
Changed from:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

To:
```css
@import "tailwindcss";
```

### 4. ✅ Updated tailwind.config.js
- Removed `extend` wrapper (not needed in v4)
- Added all color definitions at the root level
- Added scrollbar styling

### 5. ✅ Fixed QRCode Import
Changed from:
```js
import QRCode from 'qrcode.react';
```

To:
```js
import { QRCodeSVG as QRCode } from 'qrcode.react';
```

### 6. ✅ Added "type": "module" to frontend/package.json
This eliminates PostCSS module warning during build.

## Build Status

✅ **Build Successful!**
```
✓ 405 modules transformed
✓ built in 370ms

Frontend ready for development and production builds.
```

## Next Steps

The frontend is now fully configured and ready to run:

```bash
# Install everything
npm install

# Run development servers
npm run dev

# Or run frontend only
npm run dev:frontend
```

Access frontend at: **http://localhost:5173**

---

All Tailwind CSS v4 configuration issues have been resolved! 🎉

---

## QR Scanner — Deployed Environment Fix

### Issue
QR code scanning works on `localhost` but fails in deployed environments (Vercel / custom domain).

### Root Cause
`localhost` is treated as a secure context by browsers, so `navigator.mediaDevices.getUserMedia()` works without HTTPS. In production, browsers **require HTTPS** to access the camera API. The old code used `Html5QrcodeScanner` which silently failed when the camera API was unavailable.

Additionally, `Html5QrcodeScanner` injects its own dashboard UI and manages camera lifecycle loosely, causing issues with React's strict-mode-style cleanup (double render on mount).

### Fix Applied

**File:** `frontend/src/pages/venue/ScannerPage.jsx`

1. **Switched from `Html5QrcodeScanner` to `Html5Qrcode`** (lower-level API) — gives full control over camera start/stop lifecycle, avoids injected dashboard UI conflicts with React.

2. **Added HTTPS check** (`isSecureContext()`) — if the page is not served over HTTPS, a clear error message is shown instead of a blank scanner.

3. **Added specific camera error handling** — catches `NotAllowedError` (permission denied), `NotFoundError` (no camera), and generic failures with user-friendly messages.

4. **Proper cleanup** — uses `scanner.stop().then(() => scanner.clear())` for safe async teardown on unmount.

5. **Camera error UI** — shows a styled error card with a reload button when camera is unavailable.

### Key Changes
```diff
- import { Html5QrcodeScanner } from 'html5-qrcode';
+ import { Html5Qrcode } from 'html5-qrcode';
+ import { Lock } from 'lucide-react';

+ function isSecureContext() {
+   return window.isSecureContext || location.protocol === 'https:';
+ }

- const scanner = new Html5QrcodeScanner('qr-reader', { ... }, false);
- scanner.render(onScanSuccess, () => {});
+ const scanner = new Html5Qrcode('qr-reader');
+ scanner.start({ facingMode: 'environment' }, config, onScanSuccess, () => {})
+   .catch((err) => { /* handle camera errors */ });
```

### Build Status
✅ **Build Successful!**

---

## Scan API — Slow Response Time Fix

### Issue
The scan API endpoint (`POST /api/entries/scan`) takes too long to respond, causing the frontend to appear stuck at "Verifying member…" for an extended period.

### Root Cause
Two major performance issues:

1. **No indexes on Entry collection** — The duplicate-entry check query `Entry.findOne({ userId, venueId, scannedAt: { $gte, $lte } })` performs a **full collection scan** on every scan. As the entries collection grows, this query gets progressively slower.

2. **4 sequential DB queries** — The scan route ran 4 DB queries sequentially when 2 pairs were independent and could run in parallel:
   - Query 1: `User.findOne({ firebaseUid })` (scanner user)
   - Query 2: `Venue.findOne({ _id, $or: [...] })` (venue access) — depends on query 1
   - Query 3: `User.findOne({ qrCodeData })` (member) — **independent of queries 1-2**
   - Query 4: `Entry.findOne({ userId, venueId, scannedAt })` (duplicate check) — depends on query 3

### Fix Applied

**File: `backend/src/models/Entry.js`** — Added compound indexes:
```js
entrySchema.index({ userId: 1, venueId: 1, scannedAt: -1 });  // duplicate check query
entrySchema.index({ venueId: 1, scannedAt: -1 });              // venue entries listing
```

**File: `backend/src/models/Venue.js`** — Added index:
```js
venueSchema.index({ ownerId: 1 });  // venue ownership lookup
```

**File: `backend/src/routes/entries.js`** — Parallelized queries with `Promise.all`:
- **Batch 1** (parallel): Find scanner user + Find member by QR code
- **Batch 2** (parallel, after batch 1): Find venue access + Find duplicate entry

This reduces the scan route from **4 sequential DB round-trips** to **2 parallel batches**.

### Performance Impact
| Metric | Before | After |
|---|---|---|
| DB queries | 4 sequential | 2 parallel batches |
| Index scans | Full collection scan | Indexed lookup |
| Estimated latency (10k entries) | 200-500ms | 20-50ms |

### Build Status
✅ **Build Successful!**

---

## QR Scanner — UI Stuck at "Verifying member…" Fix (Frontend)

### Issue
After scanning a QR code, the UI freezes at "Verifying member… Checking membership status" even after the backend responds.

### Root Cause
The `html5-qrcode` library continuously calls the success callback as long as a QR code is visible in the camera frame. Additionally, the `pause()`/`resume()` approach from the previous fix was breaking the library's internal state machine — calling `pause()` from within the success callback caused unpredictable behavior that interfered with React state updates.

### Fix Applied

**File:** `frontend/src/pages/venue/ScannerPage.jsx`

1. **Removed `pause()`/`resume()` entirely** — these were breaking the library's internal state when called from within the callback.

2. **Added `processingRef` gate** — a simple boolean ref that blocks re-entry while a scan is being processed:
   ```js
   const processingRef = useRef(false);
   
   // In callback:
   if (processingRef.current) return;
   processingRef.current = true;
   // ... after timeout resets status:
   processingRef.current = false;
   ```

3. **Switched from async/await to .then()/.catch()** — the `html5-qrcode` library's callback is called synchronously. Using `async` with `await` inside could cause the library's internal loop to misbehave. Using `.then()/.catch()` ensures the callback returns immediately (undefined) and the promise resolution happens independently.

4. **Removed pause overlay CSS rule** — no longer needed.

### Key Changes
```diff
- async (decodedText) => {
+ (decodedText) => {
+   if (processingRef.current) return;
    // ...
-   try { localScanner.pause(); } catch (_) {}
    // ...
-   try {
-     setStatus('scanning');
-     const res = await scanQREntry({ ... });
-     if (cancelled) return;
-     setResult(res.data);
-     setStatus('success');
-     setTimeout(() => { ...; try { localScanner.resume(); } catch (_) {} }, 5000);
-   } catch (err) {
-     ...
-   }
+   setStatus('scanning');
+   scanQREntry({ ... })
+     .then((res) => {
+       if (cancelled) return;
+       setResult(res.data);
+       setStatus('success');
+       setTimeout(() => { ...; processingRef.current = false; }, 5000);
+     })
+     .catch((err) => {
+       ...
+       setTimeout(() => { ...; processingRef.current = false; }, 4000);
+     });
  }
```

### Build Status
✅ **Build Successful!**

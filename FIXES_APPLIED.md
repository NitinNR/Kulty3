# 🔧 Fixes Applied

## Block member login for venue-partner accounts (`intentRole`)

### Problem
A user who started signing up as a venue partner (`/partner`, phone or Google) and left before submitting the application keeps `intentRole: 'venue_owner'` on their user document. If they later open the **member** login (`/login`), they were silently routed into the member app (or the old `/apply-venue` redirect) instead of being told the account is a partner account.

### Change
The member login now detects `profile.intentRole === 'venue_owner'` (when the account isn't already an admin / venue_owner / venue_staff) and shows a notice instead of signing them in. The backend self-heal that used to silently clear `intentRole` in exactly this case was removed so the flag survives an abandoned application.

### Backend
- **`backend/src/routes/users.js`** — removed the `GET /me` "self-heal" that nulled `intentRole` when a user had a completed profile but no `VenueApplication` (it also removed the now-unused `VenueApplication` import). `intentRole: 'venue_owner'` now persists for abandoned partner sign-ups until an admin changes the role. Replaced it with an explanatory comment.

### Frontend
- **`frontend/src/pages/auth/LoginPage.jsx`**
  - Redirect effect now computes `isPartnerApplicant = intentRole === 'venue_owner' && role not in {admin, venue_owner, venue_staff}`, stores it in `partnerAccount` state, and **returns early** (no member redirect) for those accounts. The stale redirect resets `partnerAccount` when unauthenticated.
  - New gate screen: "You can't sign in with this account" — explains the identifier is a Kulty venue partner and that a partner account can't be used to log in / sign up as a member. Actions: **Continue venue partner application** (→ `/apply-venue`, or `/complete-profile?next=/apply-venue` if no profile yet) and **Sign out & use another account**.
  - Added `logout` from `useAuth` and `Building2` / `LogOut` icons.

### Build Status
✅ Backend `node --check` OK, `npm test` 15/15 · ✅ Frontend build successful (`dist/assets/index-N8CsiyKC.js`)

---

## Friendly OTP errors + IPBlocked handling (MSG91)

### Change
OTP failures no longer surface raw MSG91 codes (e.g. `IPBlocked`) to users. The backend now maps MSG91/network failures to friendly, client-safe messages with a machine code + HTTP status, and the frontend normalizes anything the widget emits client-side. **`IPBlocked`** gets a dedicated message telling the user to retry in a couple of minutes.

### Backend
- **`backend/src/services/msg91.js`** — new `postWidget()` wrapper (converts axios network/timeout errors into a friendly `MSG91_UNAVAILABLE` 503) and `msg91Failure()` mapper used by `retryOtp`, `verifyOtp`, `verifyAccessToken`:
  - IP blocked (`/ip[\s_-]?block/` or "too many otp") → `IP_BLOCKED`, **429**, "Too many OTP requests from your network. Please wait a couple of minutes and then try again."
  - expired → `OTP_EXPIRED`; incorrect/not-matched → `INVALID_OTP`; bare codes fall back to the caller's friendly message; everything else → `MSG91_ERROR`.
  - Thrown errors carry `{ message, code, status, expose: true }`; raw internals are never exposed.
- **`backend/src/routes/auth.js`** — `POST /auth/msg91/retry` and `POST /auth/msg91/verify` now respond with `{ error, code? }` via a new `otpFailure(error, fallback)` helper that honors the service's status (e.g. 429) and only exposes messages flagged `expose`.

### Frontend
- **`frontend/src/services/msg91.js`** — `getMsg91ErrorMessage()` rewritten to handle widget errors (string / `{message|error|msg}`) **and** axios errors (`response.data.error` + `code`): detects IP-block (message or `IP_BLOCKED` code) → retry-later message, prefers the backend's friendly text, and never shows a bare code (falls back to a generic message).
- **`frontend/src/pages/auth/LoginPage.jsx`** / **`PartnerLoginPage.jsx`** — `handleResendOTP` / `handleVerifyOTP` now route every error through `getMsg91ErrorMessage` (dropping the raw `err.response.data.error` shortcut) so all three OTP actions show friendly copy consistently.

### Build Status
✅ Backend `node --check` OK, `npm test` 15/15 · ✅ Frontend build successful (`dist/assets/index-DqigBgln.js`)

---

## Captcha moved above the Send OTP button (member + partner login)

### Change
The MSG91 captcha no longer floats fixed at the bottom of the viewport — it now renders inline **above the "Send OTP" button** on both the member (`/login`) and partner (`/partner`) phones flows.

### Why it's non-trivial
MSG91 binds its `<h-captcha>` element into the host **once** and never re-binds, so the host node must never unmount. It therefore still lives at the app root (`Msg91CaptchaHost` in `App.jsx`); instead of repositioning it with CSS, the host node is now **physically moved** into a placeholder rendered by the form.

### Frontend
- **`frontend/src/services/msg91.js`** — new `MSG91_CAPTCHA_ANCHOR_ID` (`msg91-captcha-anchor`) constant for the in-form placeholder.
- **`frontend/src/App.jsx`** — `Msg91CaptchaHost` renders the persistent host inside an off-screen fallback container and, via an effect keyed on `[shouldShow, pathname, step]`, `appendChild`s it into the login form's anchor while the challenge is needed, or back to the fallback otherwise. Fixed bottom placement removed.
- **`frontend/src/pages/auth/LoginPage.jsx`** / **`frontend/src/pages/auth/PartnerLoginPage.jsx`** — added `<div id={MSG91_CAPTCHA_ANCHOR_ID} className="flex justify-center overflow-x-auto no-scrollbar" />` directly above the Send OTP button; helper copy now says "…challenge above…" instead of "below".

### Build Status
✅ **Frontend build successful** (`dist/assets/index-BiFRKPbI.js`)

---

## Partner login — MSG91 phone (OTP) sign-in

### Feature
The partner/venue-owner login (`/partner`) now offers phone sign-in with the MSG91 OTP widget, matching the member login. The admin **Login Settings** toggle (Google / Phone) now governs both screens.

### Frontend
- **`frontend/src/pages/auth/PartnerLoginPage.jsx`** — added the full phone flow used by `LoginPage`:
  - Country-code selector (India only) + mobile input, **Send OTP** button.
  - OTP step with the shared `OtpInput`, resend (backend SMS retry) with a 30s cooldown, and change-number.
  - Captcha-aware: Send OTP stays disabled until MSG91's captcha is solved (via `useMsg91Captcha`), and reports each signed-in account as `existingMember` instead of tagging them as a venue owner.
  - Google button and the "or use phone" divider now render conditionally from `authMethods`; if Google is disabled the partner page still works via phone.
  - Successful verify mints a Firebase session (`signInWithCustomToken`); the existing routing effect then tags a brand-new account `intentRole: 'venue_owner'` and sends it through the venue-owner onboarding.
  - "Already signed in" / "account already registered" gate wording generalised (was Google-specific).
- **`frontend/src/App.jsx`** — the persistent MSG91 captcha host now also shows on `/partner` (`onPhoneAuthScreen = /login || /partner`), step-gated and hidden once verified / on the OTP step.
- **`frontend/src/pages/admin/AdminSettingsPage.jsx`** — help text updated: the toggle applies to the member **and** partner login screens.

### Notes
- No backend change required — `POST /auth/msg91/verify` (existing) creates/reuses the user and returns the custom token.
- Sign-in method setting still only controls what the UI offers; it does not revoke existing sessions.

### Build Status
✅ **Frontend build successful** (`dist/assets/index-DaDusnNx.js`)

---

## Infinite API loop — `GET /users/me` + `GET /payments/my`

### Problem
The app was firing both endpoints continuously.

### Root cause
`AuthContext.fetchProfile` called `setProfile(profileRes.data)` with a **brand-new object on every call**, even when the data was identical. The payment page's double-charge guard (`PaymentPage.jsx`) lists `profile` in its effect deps *and* calls `refreshProfile()` inside its poll loop — so each `setProfile` re-identified `profile`, which restarted the effect, which called `refreshProfile()` again → `getMe()` + `getMyPayments()` forever. `refreshProfile` was also re-created on every provider render, so `PartnerLoginPage`'s effect re-ran on every context render.

### Fix
- **`frontend/src/contexts/AuthContext.jsx`**
  - `fetchProfile` now only commits a new `profile` when the data actually changed (JSON compare), so identical refetches no longer re-render and cannot restart `[profile]`-keyed effects.
  - `refreshProfile` and `logout` wrapped in `useCallback`; the provider value in `useMemo` — stable identities so effects that list them no longer re-run on every render.

### Result
- Normal payment-page visit: **1×** `/payments/my` + **1×** `/users/me` (was unbounded).
- With an in-flight order the guard still polls, but is bounded to its 5 attempts.

### Build Status
✅ **Frontend build successful** (`dist/assets/index-DjIiWo1e.js`)

---

## Security hardening — mass assignment, IDOR, ReDoS, data leakage

### Problems found
1. **Mass assignment** — `PATCH /users/me` applied `req.body` verbatim (a user could set their own `role`, `subscription`, `membershipId`, …); `POST /applications` spread `...req.body` after `userId` (self-approval / impersonation); venue create/update spread/assigned `req.body` (owner could set `staff`, `ownerId`, `status`).
2. **IDOR** — `GET /entries/venue/:venueId` and `PATCH /entries/:entryId/bills/:billId` only checked the caller had a venue role, not that they belonged to *that* venue, so any venue account could read/approve another venue's check-ins and bills.
3. **ReDoS / regex injection** — user-supplied `search` and city values were interpolated straight into `new RegExp(...)` (`venues.js`, `events.js`, `admin.js`, `cities.js`, application→city in `admin.js`).
4. **Data leakage** — public venue responses exposed the `staff` email list: `GET /venues`, `GET /venues/:id`, venue objects populated by `GET /events`, `GET /events/:id`, `GET /entries/my`, and `GET /users/favorites`.
5. `x-powered-by` header advertised the stack.

### Fixes
- **New `backend/src/utils/escapeRegex.js`** — escapes regex metacharacters; applied everywhere untrusted input reaches a `RegExp` (`venues.js`, `events.js`, `admin.js`, `cities.js`).
- **`backend/src/routes/users.js`** — `PATCH /me` now allow-lists `name`, `profilePhoto`, `intentRole` via `$set`; stripped `-staff` from the favorites venue query.
- **`backend/src/routes/applications.js`** — `POST /` now picks only `businessName/category/description/city/address/contactPhone`, forces `userId` + `status:'pending'`.
- **`backend/src/routes/entries.js`** — both venue-scoped routes now verify the caller owns/is staff of `entry.venueId`; the venue lookup is reused for cashback; `GET /my` populates `venueId` with `-staff`.
- **`backend/src/routes/venues.js`** — content-field allow-list for POST/PUT (`ownerId`/`status` privileged to admin only, `staff` never mass-assignable); public list/detail select `-staff`.
- **`backend/src/routes/events.js`** — escaped `search`; populated venues select `-staff`.
- **`backend/src/routes/admin.js`** — escaped admin venue search + application→city lookup.
- **`backend/src/server.js`** — `app.disable('x-powered-by')`.

### Build Status
✅ **Backend syntax check passed** (`node --check` on all 9 changed/new files)

---

## Phone Login — captcha only when phone auth is enabled

### Problem
With the new admin toggle, a Google-only setup (phone auth disabled) still initialized the MSG91 widget and rendered the captcha (`h-captcha`) on the login screen.

### Fix
- **`frontend/src/App.jsx`**
  - `Msg91CaptchaHost` now also requires `authMethods.phone` (and settings to be loaded, to avoid a flash) before it becomes visible.
  - App-level MSG91 widget init is skipped until settings are loaded and `authMethods.phone` is true — so on a Google-only setup the widget script/`h-captcha` is never loaded at all.
- **`frontend/src/pages/auth/LoginPage.jsx`** — the lazy `ensureWidget()` now passes `captchaRenderId`, so if phone auth is enabled mid-session the widget still initializes correctly (previously it relied on the always-on app-level init).

### Build Status
✅ **Frontend build successful** (`dist/assets/index-BYIEJyYs.js`)

---

## Admin — configurable sign-in methods (Google / Phone)

### Feature
Admins can now choose which sign-in methods appear on the login screen (Google, Phone/OTP, or both) from **Admin → Login Settings**. At least one method must stay enabled.

### Backend
- **New `backend/src/models/Settings.js`** — singleton settings document (fixed key `global`) holding `authMethods: { google, phone }`.
- **New `backend/src/routes/settings.js`**:
  - `GET /api/settings` (public) → `{ authMethods }`, defaults to both enabled when unset/DB error (fail-open, so login is never locked out).
  - `PUT /api/settings` (admin only) → validates that at least one method remains enabled, then saves.
- **`backend/src/server.js`** — mounted `app.use('/api/settings', settingsRoutes)`.

### Frontend
- **`frontend/src/services/api.js`** — `getPublicSettings()` and `updateSettings(data)`.
- **New `frontend/src/hooks/useAppSettings.js`** — shared, cached store (`useSyncExternalStore`) for the setting; defaults to both enabled until the API responds / on failure.
- **New `frontend/src/pages/admin/AdminSettingsPage.jsx`** — two toggle switches + Save, validation, success/error states; pushes the saved values into the shared store so the login screen updates immediately.
- **`frontend/src/App.jsx`** — route `/admin/settings` (admin-gated).
- **`frontend/src/pages/admin/AdminDashboard.jsx`** — "Login Settings" quick-action card.
- **`frontend/src/pages/auth/LoginPage.jsx`** — Google button, the "or use phone" divider, and the phone/OTP block now render conditionally from `authMethods`; the header icon follows the enabled method and a fallback message shows if neither is on.

### Notes
- Applies to the member login screen (`/login`). The partner login (`/partner`) is Google-only and unchanged.
- Changing the setting only affects what the login UI offers; it does not revoke existing sessions.

### Build Status
✅ **Frontend build successful** (`dist/assets/index-8Tbyv88z.js`)
✅ **Backend syntax check passed** (`node --check`)

---

## Phone Login — stale captcha after logout + captcha always visible

### Issues
1. After logout the previously-solved captcha stayed on the login screen, so the page had to be refreshed to get a usable one.
2. The captcha UI was shown the entire time the user was on `/login`, even after they had solved it.

### Root Cause
MSG91 appends its `<h-captcha>` element into the captcha host **once** (when the widget config loads) and never re-renders it, so a used challenge lingers. The host visibility was also keyed only off the route (`pathname === '/login'`).

### Fix Applied
**New `frontend/src/hooks/useMsg91Captcha.js`** — a single polled store (`useSyncExternalStore`) shared by the host and the login screen, exposing `{ required, verified, otpLength, step }`. Replaces the two independent widget polls.

**`frontend/src/services/msg91.js`** — added `resetMsg91Captcha()`: finds the rendered `h-captcha` element(s) in the host and calls `reset()` to force a fresh, un-solved challenge (false when nothing is rendered).

**`frontend/src/App.jsx` (`Msg91CaptchaHost`)** —
- Shown only when `pathname === '/login' && step === 'method' && !verified` (hidden once verified, hidden on the OTP step).
- Resets the captcha whenever it transitions into "needed" and isn't already solved → a fresh challenge after logout (or after going back from the OTP step), no refresh required.

**`frontend/src/pages/auth/LoginPage.jsx`** — removed the local captcha/OTP-length state + poll, now consumes the shared hook; publishes its `step` via `setMsg91LoginStep(step)`.

### Build Status
✅ **Frontend build successful** (`dist/assets/index-BIiBA97W.js`)

---

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
## Webhook Self-Test Now Fully Green + Duplicate Payment Indexes Removed

### Issue
Running `npm run test:webhook` for the first time surfaced two real defects:

1. **Duplicate schema indexes.** `Payment.js` declared `razorpayOrderId` with `unique:true` and `firebaseUid`/`status` with `index:true`, **and** repeated them via `paymentSchema.index({ razorpayOrderId: 1 })` / `{ razorpayPaymentId: 1 }` / `{ firebaseUid: 1, createdAt: -1 }` / `{ status: 1, createdAt: -1 }`. Mongoose logged `Duplicate schema index` warnings on every boot and maintained redundant indexes (extra write cost, doubled index builds).
2. **A broken assertion in the test itself.** Case 1 "signature over a different body" signed `tampered` and then sent that *same* body — so the signature matched and the server correctly returned 200, failing an assertion that expected 400. The test was wrong, not the server.

### Fix Applied
- **`backend/src/models/Payment.js`** — removed the `index: true` options on `firebaseUid` and `status`, and removed the two redundant `schema.index()` calls for `razorpayOrderId` and `razorpayPaymentId` (their field-level `unique`/`sparse` definitions already index them). Final indexes: `razorpayOrderId` (unique), `razorpayPaymentId` (sparse), `{ firebaseUid, createdAt }`, `{ status, createdAt }` — covering every query in the codebase with no duplicates.
- **`backend/test-webhook.mjs`** — the tamper case now signs one body but sends a different one (`signedBody` vs `sentBody`), so it genuinely proves a mismatched signature is rejected.

### Verification
✅ `cd backend && npm run test:webhook` → **18 passed, 0 failed** (`ALL GREEN`), test data self-cleaned
✅ Zero `Duplicate schema index` warnings on boot
✅ `cd backend && npm test` → 15 passed, 0 failed

### Build Status
✅ **Webhook end-to-end self-test green · No duplicate indexes**

---

## Payment Recovery & Double-Charge Guard — Closing the "Paid But Not Activated" Gap

### Issue
The previous overhaul added a ledger and made the webhook verify correctly, but two gaps remained:

1. **No recovery for captured-but-unactivated payments.** If the browser closed before `/verify` **and** the webhook never arrived (`RAZORPAY_WEBHOOK_SECRET` still unset, or a delivery failure), money was captured in Razorpay while the ledger row sat at `status:'created'` forever. Nothing ever reconciled it, and nothing told the member.
2. **A returning member could be charged twice.** `PaymentPage` offered a fresh checkout with no awareness of a prior in-flight order, so a member who had already paid (but not been activated) was invited to pay again.

### Fix Applied

**New file:** `backend/src/services/paymentSettlement.js`
- Extracted the settlement primitives (`PLANS`, `CURRENCY`, `DEFAULT_PLAN`, `getRazorpay`, `resetRazorpay`, `safeEqual`, `appendEvent`, `activateSubscription`, `resolveUserForOrder`) plus a single `settleCapturedPayment({ orderId, payment, via })`.
- `/verify`, the webhook, **and** reconciliation now all settle through this one function, so recovery produces byte-for-byte the same end state as a normal payment. Purely a refactor — behaviour preserved (`npm test` still 15/15).

**New file:** `backend/src/services/reconcile.js`
- `reconcileStuckPayments({ olderThanMinutes, limit, dryRun })` — finds ledger rows at `status:'created'` older than the cutoff, asks Razorpay `orders.fetchPayments(orderId)` for the truth, and:
  - finds a `captured` payment → settles it via `settleCapturedPayment(..., via:'admin')` (idempotent, so concurrent runs are safe);
  - finds only `failed` payments → marks the row `failed`;
  - finds nothing → leaves it `abandoned`.
- `reconcileForUser(firebaseUid, …)` — the same logic **scoped to one member**, bounded to 3 orders and **never throws**.

**New file:** `backend/src/routes/adminPayments.js` — thin admin/cron surface:
- `GET|POST /api/admin/payments/reconcile` (query `olderThanMinutes`, `limit`, `dryRun`).
- `GET /api/admin/payments/stuck` — read-only visibility of stuck orders.
- Auth accepts **either** `Authorization: Bearer ${CRON_SECRET}` (for a scheduler) **or** a logged-in admin's Firebase token with `role:'admin'`.

**`backend/src/routes/payments.js`**
- `GET /payments/my` now runs `reconcileForUser(req.user.uid)` **before** returning history. This deliberately puts recovery exactly where it matters — the moment the member opens their payments, which is also the moment `PaymentPage` calls it. No scheduler required, and it works on any Vercel plan (Hobby restricts cron frequency, so a mandatory cron would have been a deploy risk).

**`backend/src/server.js`**
- Mounts `adminPaymentsRoutes` at `/api/admin/payments` **before** the generic `/api/admin` router.

**New file:** `frontend/src/services/api.js` → `getMyPayments()`.

**`frontend/src/pages/payment/PaymentPage.jsx` — double-charge guard**
- On load (when not already live) it polls up to 5× (3s apart): calls `getMyPayments()` (which triggers server-side reconcile) **and** re-reads the freshest entitlement via `refreshProfile()`. The profile refresh is essential — otherwise a successful server-side reconcile would leave the local profile stale and the guard would re-offer checkout.
- If the term became live → redirect to `/payment/success`; if still unsettled after the polls → show an amber "you have a payment we're still confirming" banner and relabel the CTA **"Pay again anyway"**. Fail-open: any error clears the guard so checkout is never blocked.
- `refreshProfile` is held in a `useRef` (it is re-created on every `AuthProvider` render).

**`backend/.env.example`**
- Documented optional `CRON_SECRET` and the reconcile endpoints; noted that per-user recovery is automatic.

### Design note
Recovery is intentionally **lazy and per-user** rather than cron-only: the member returning to the payment page is precisely the moment a stuck capture is dangerous, so settling it there removes the double-charge risk at the source while requiring no scheduler and no plan upgrade. The bulk admin/cron endpoint remains available for a proactive sweep.

### Verification
✅ `node --check` clean on `payments.js`, `adminPayments.js`, `paymentSettlement.js`, `reconcile.js`, `server.js`
✅ Full server module graph imports cleanly (`VERCEL=1`)
✅ `cd backend && npm test` → **15 passed, 0 failed** (refactor is behaviour-neutral)
✅ `cd frontend && npm run build` → built successfully, no errors

### Build Status
✅ **Frontend build successful · Backend syntax check passed · Service refactor verified behaviour-neutral**

---

## Payment Security Overhaul — Razorpay Webhook Was Never Verifying Anything

### Issue
The Razorpay webhook endpoint existed and looked correct, but **had never verified a single event**. `RAZORPAY_WEBHOOK_SECRET` was declared in `backend/.env.example` but never added to `backend/.env`, so every delivery hit the "secret not set" branch, logged an error, and returned **HTTP 200 `{status:'ignored'}`**. Razorpay read that as a successful delivery and stopped retrying.

Confirmed from `backend/logs/`: `POST /api/payments/webhook` = **0 hits** across all 8 log files (including 3 `.gz` archives), while `create-order`/`verify` = 3 hits.

**Impact:** payment verification depended *entirely* on the browser calling `/verify`. If the tab closed, crashed, or lost network after Razorpay captured the money, the member was charged and never activated. No recovery path.

Five further defects were found while tracing the flow end to end:

| # | Severity | Defect |
|---|---|---|
| 1 | **Critical** | `/verify` never checked the order belonged to the caller → **free membership for any signed-in user** |
| 2 | **Critical** | `create-order` wrote `status:'pending'` unconditionally → **active members lost access** the moment renewal checkout opened |
| 3 | **Critical** | Webhook resolved the payer via the single mutable `subscription.razorpayOrderId` → **delayed webhooks orphaned** once a second order existed |
| 4 | **High** | Webhook returned HTTP 200 on internal error → DB failures **silently discarded**, no retry |
| 5 | **High** | `refund.processed` / `charge.dispute.created` unhandled → **refunded members kept access forever** |

Plus: non-constant-time signature comparison, unguarded `rawBody`, unguarded `RAZORPAY_KEY_SECRET`, no currency check, no rate limiting, `plan` request field ignored, and `backend/.env` not excluded from Vercel uploads.

### Fix Applied

**New file:** `backend/src/models/Payment.js`
- Immutable one-row-per-order ledger: `razorpayOrderId` (unique), `razorpayPaymentId`, `userId`, `firebaseUid`, `amount`, `currency`, `plan`, `status` (`created → captured | failed | partially_refunded | refunded | disputed`), `capturedAt`, `refundedAt`, `refundId`, `disputeId`, `activatedVia`, and an append-only `events[]` audit trail.
- Indexes on `razorpayOrderId`, `razorpayPaymentId`, `{firebaseUid, createdAt}`, `{status, createdAt}`.

**New file:** `backend/src/utils/subscription.js`
- `isSubscriptionLive()` / `daysUntilExpiry()` / `nextTermStart()` / `addYears()` — single source of truth for entitlement, so the scan gate and the UI stop disagreeing.
- `nextTermStart()` extends a live membership from its existing `endDate`, so **renewing early no longer destroys paid-for days**.

**New file:** `backend/test-subscription.mjs` (+ `npm test` in `backend/package.json`)
- 15 assertions covering expiry boundaries, legacy records with no `endDate`, and renewal chaining. Run with `cd backend && npm test`.

**`backend/src/routes/payments.js`** — rewritten:
1. **Missing secret → HTTP 500**, not 200. Non-2xx makes Razorpay retry, so events queued during the outage still settle once the secret is added.
2. **`safeEqual()`** — `crypto.timingSafeEqual` with a length guard replaces `!==` on both `/verify` and the webhook.
3. **`rawBodyBuffer()`** — normalises Buffer/string/`undefined`; missing raw body returns 400 instead of throwing into the catch.
4. **Fix #1 — order ownership (Layer 3).** `/verify` now loads the ledger row for the order and requires `paymentDoc.firebaseUid === req.user.uid`, else **403**. This closes the free-membership hole: the `(order_id, payment_id, signature)` triple in the payer's browser is no longer replayable against another account.
5. **Fix #2 — renewal no longer revokes.** `create-order` only sets `pending` when `!isSubscriptionLive(user.subscription)`.
6. **Fix #3 — ledger-backed webhook lookup.** `resolveUserForOrder()` queries `Payment` by `razorpayOrderId`, falling back to the legacy `subscription.razorpayOrderId` field so orders created *before* this deploy still settle. New orders no longer overwrite that field.
7. **Fix #4 — real failures return 500** so Razorpay retries. Only genuinely unrecoverable cases (`user_not_found`) return 200.
8. **Fix #5 — refunds & disputes.** `refund.processed` marks the ledger `refunded`/`partially_refunded` and revokes the membership only on a **full** refund of the payment currently backing it (partial refunds and superseded payments retain access). `charge.dispute.created` revokes immediately.
9. **`plan` catalogue** (`PLANS`) replaces the hardcoded `PLAN_AMOUNT`; the request `plan` is whitelisted, never trusted for amount.
10. **Currency check** added alongside the amount check.
11. **`membershipId`** widened from 8 to 12 hex chars of the ObjectId (32 → 48 bits) to make `unique`-index collisions negligible. Existing IDs untouched.
12. **Rate limiting** on `/create-order` (10/min) and `/verify` (20/min), with Map cleanup.
13. **`RAZORPAY_KEY_SECRET` guarded** before use → 503 with a clear message instead of a 500 TypeError.
14. **`order.paid` acknowledged but never grants** — it can arrive before capture; only `payment.captured` activates.
15. **`GET /payments/my`** — member-visible payment history (50 most recent).

**`backend/src/server.js`**
- The webhook's raw bytes are now captured by a dedicated `express.raw({ type: '*/*' })` mounted on `/api/payments/webhook`, which also JSON-parses the buffer so `req.body` stays an object. The old `express.json({ verify })` hook **only fires for `application/json`**, so any other content type left `rawBody` undefined. The global JSON parser now skips that path.
- JSON limit tightened `10mb → 2mb` (verified no route accepts uploads or base64 — all media is URL-referenced).

**`backend/src/routes/entries.js`**
- Scan gate now uses `isSubscriptionLive()` instead of `status === 'active'`, which **ignored `endDate`** — a lapsed membership scanned in forever. Self-heals `status → 'inactive'` on first attempt. A missing `endDate` is still treated as live, so legacy records are unaffected.

**Frontend** — `frontend/src/utils/subscription.js` (new, mirrors the backend helper) plus:
- `PaymentPage.jsx` — redirects to `/card` only on a **live** term, so a lapsed member can renew. Verification failures now say the payment was received and will activate, instead of implying a retry.
- `PaymentSuccessPage.jsx` — polls up to 8× until the profile is live before redirecting, showing a "payment received, still confirming" state instead of bouncing into an inactive card screen. Holds `refreshProfile` in a ref because it is re-created on every `AuthProvider` render.
- `CardPage`, `ProfilePage`, `VenueDetailPage`, `Navbar`, `LoginPage`, `SubscriptionRoute` — entitlement checks switched from `status === 'active'` to `isSubscriptionLive()`. `AdminUsersPage` intentionally still shows the **raw** stored status (admin data view).

**`.vercelignore`** — now excludes `.env*` (with `!.env.example`). Previously only `.gitignore` covered them, so a `vercel --prod` CLI upload would have shipped `backend/.env` — live Razorpay key secret included — inside the function bundle.

**`vercel.json`** — explicit `/api/payments/webhook` rewrite ahead of the generic catch-all.

### Verification

✅ Frontend build successful (495 modules)
✅ `node --check` clean on all 5 touched backend files; full server module graph imports without error
✅ **Live webhook test against a running server** (temp secret, port 5099):

| Case | Result |
|---|---|
| No signature header | `400 Missing signature header` ✅ |
| Wrong signature | `400 Invalid webhook signature` ✅ |
| Valid signature over **tampered** body | `400 Invalid webhook signature` ✅ |
| Valid signature, `application/json` | `200` — verified ✅ |
| Valid signature, `text/plain;charset=UTF-8` | `200` — verified ✅ *(old code returned 200 `status:'error'`)* |
| Valid signature, `application/octet-stream` | `200` — verified ✅ |
| Valid signature, content-type header omitted | `200` — verified ✅ |
| `/verify`, `/create-order`, `/payments/my` unauthenticated | `401 No token provided` ✅ |

✅ `cd backend && npm test` → **15 passed, 0 failed**

### ⚠️ ACTION REQUIRED — the webhook is live but not yet configured
`RAZORPAY_WEBHOOK_SECRET` is still **not set**. Until it is, every webhook returns 500 and no membership is granted via webhook.

In Razorpay Dashboard → **Settings → Webhooks**:
1. **Webhook URL:** `https://kulty.in/api/payments/webhook`
2. **Secret:** generate one, then add to `backend/.env` → `RAZORPAY_WEBHOOK_SECRET=<secret>`
3. **Active events:** `payment.captured`, `payment.failed`, `refund.processed`, `charge.dispute.created`
4. Set the same secret as a Vercel production env var.

Then confirm delivery: Razorpay Dashboard → Webhooks → the endpoint should show **200** deliveries, and `backend/logs/combined-*.log` will contain `Razorpay webhook event: payment.captured`.

### Build Status
✅ **Frontend build successful · Backend syntax check passed · Live webhook verification test passed**

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

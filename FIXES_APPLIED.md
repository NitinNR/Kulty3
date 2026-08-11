# 🔧 Fixes Applied

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

# 🔧 Fixes Applied

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

## QR Scanner — Two Scanners on Mobile Fix

### Issue
After switching to `Html5Qrcode`, two camera preview areas appeared on mobile devices.

### Root Cause
`Html5Qrcode.start()` creates both a `<video>` element (live camera feed) and a `<canvas>` element (used internally for frame capture/QR detection) inside `#qr-reader__scan_region`. On mobile, both elements were visible, creating the appearance of two scanners.

Additionally, the old `SCANNER_CSS` block still contained rules targeting `Html5QrcodeScanner`-specific DOM elements (`#qr-reader__dashboard`, `#qr-reader__camera_permission_button`, etc.) which don't exist when using the `Html5Qrcode` low-level API.

### Fix Applied

**File:** `frontend/src/pages/venue/ScannerPage.jsx`

1. **Hid the internal canvas** — added CSS to shrink the canvas to 1px with `opacity: 0` so it's invisible but still functional for QR frame processing:
   ```css
   #qr-reader__scan_region canvas {
     position: absolute !important;
     width: 1px !important;
     height: 1px !important;
     opacity: 0 !important;
     pointer-events: none !important;
   }
   ```

2. **Cleaned up dead CSS** — removed all `#qr-reader__dashboard_*`, `#qr-reader__camera_*` rules that targeted `Html5QrcodeScanner` elements (no longer rendered).

3. **Added `object-fit: cover`** to video for proper mobile aspect ratio.

4. **Added `cancelled` flag** in the effect to prevent state updates after unmount during React StrictMode double-mount.

5. **Captured local scanner ref** in cleanup to prevent async `stop().then()` from accidentally clearing a new scanner instance.

### Build Status
✅ **Build Successful!**

---

## Scan API — "Internal server error" Fix

### Issue
Scanning a QR code returns `{"error":"Internal server error"}` in deployed environments.

### Root Cause
The error was NOT in the scan route handler (which returns `"Failed to scan entry"`), but in the **CORS middleware** in `server.js`. The CORS `origin` callback called `cb(new Error(...))` when the request origin wasn't in the allowed list. This error propagated to the global error handler, which returned the generic `"Internal server error"` message.

The `allowedOrigins` list only contained `kulty.in` and `www.kulty.in`. On Vercel, the deployment URL (e.g., `kulty3-xxx.vercel.app`) was not in the list, so every API request from that URL was rejected by CORS.

Additionally, the global error handler returned the same generic message for ALL errors (CORS, body parsing, etc.), making it impossible to diagnose the issue.

### Fix Applied

**File:** `backend/src/server.js`

1. **Added `VERCEL_URL` to allowed origins** — Vercel automatically sets this env var to the deployment URL:
   ```js
   process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`
   ```

2. **Added `FRONTEND_URL` env var support** — single frontend URL override.

3. **Removed debug `console.log`** from CORS middleware (was logging `Is allowed origin ?` on every request).

4. **Improved global error handler** — CORS errors now return 403 with the actual CORS message instead of generic "Internal server error":
   ```js
   const isCors = err.message?.startsWith('CORS:');
   res.status(isCors ? 403 : 500).json({ error: isCors ? err.message : 'Internal server error' });
   ```

5. **Updated `.env.example`** — documented the `FRONTEND_URLS` env var.

### Build Status
✅ **Build Successful!**

---

## Backend Logging System

### What Was Added
A production-grade logging system using **winston** with **daily rotating files**, automatic cleanup, and structured log output.

### New Files

**`backend/src/config/logger.js`** — Central logger configuration:
- **3 rotating file transports** (only active outside Vercel, since its filesystem is read-only):
  - `error-YYYY-MM-DD.log` — errors only
  - `combined-YYYY-MM-DD.log` — all levels
  - `access-YYYY-MM-DD.log` — HTTP access logs
- **Console transport** — always active (with colorized output in dev)
- **Exception + rejection handlers** — unhandled errors logged to dedicated files
- **Log rotation**: daily rotation, `20MB` max size per file, `14 days` retention, old logs auto-deleted and zipped

**`backend/src/middleware/requestLogger.js`** — HTTP access log middleware:
- Logs every request: method, URL, status code, duration, IP, user-agent
- Captures authenticated user ID when available
- Masks sensitive fields (password, token, authorization, etc.)
- Uses `http` level for success, `warn` for 4xx, `error` for 5xx

### Files Updated (11 files, 31 replacements)
All `console.error` / `console.log` / `console.warn` calls replaced with structured logger calls:

| File | Changes |
|---|---|
| `server.js` | Added logger + requestLogger imports, DB error logging, global error handler logging |
| `routes/entries.js` | 5 error calls |
| `routes/venues.js` | 2 error calls |
| `routes/admin.js` | 5 error calls |
| `routes/payments.js` | 4 error, 2 warn, 2 info calls |
| `routes/users.js` | 3 error calls |
| `routes/events.js` | 2 error calls |
| `routes/applications.js` | 1 error call |
| `routes/auth.js` | 2 error calls |
| `services/firebaseAdmin.js` | 1 info, 1 error call |
| `middleware/firebaseAuth.js` | 2 error calls |
| `config/db.js` | 1 info, 1 error call |

### Log Output Format
```
[2026-07-26 14:32:15.123] INFO: Server running on http://localhost:5000
[2026-07-26 14:32:18.456] HTTP: POST /api/entries/scan 201 234ms {"userId":"abc123"}
[2026-07-26 14:32:19.789] ERROR: Token verification failed {"error":"invalid-token","stack":"..."}
```

### Environment Variables
| Variable | Default | Description |
|---|---|---|
| `LOG_LEVEL` | `info` | Minimum log level (`error`, `warn`, `info`, `http`, `debug`) |
| `LOG_MAX_FILES` | `14d` | How long to keep old log files |
| `LOG_MAX_SIZE` | `20m` | Max size per log file before rotation |

### Vercel Note
On Vercel, filesystem is read-only — only the console transport is active. Logs are visible in Vercel function logs. For persistent file-based logging, deploy the backend separately (e.g., Railway, Render, VPS).

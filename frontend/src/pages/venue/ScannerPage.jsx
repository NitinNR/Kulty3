import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  ArrowLeft, CheckCircle, XCircle, Loader2,
  ScanLine, Wifi, UserCheck, AlertCircle, Lock,
} from 'lucide-react';
import { scanQREntry, getMyVenue } from '../../services/api';

const SCAN_COOLDOWN_MS = 3000;

function isSecureContext() {
  return window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
}

// Override html5-qrcode library's injected styles to match dark theme
const SCANNER_CSS = `
  #qr-reader {
    border: none !important;
    background: transparent !important;
    padding: 0 !important;
    width: 100% !important;
  }
  #qr-reader__scan_region {
    background: #000 !important;
    border-radius: 0 !important;
    min-height: 260px !important;
  }
  #qr-reader__scan_region img { display: none !important; }
  #qr-reader video {
    width: 100% !important;
    object-fit: cover !important;
  }
  #qr-reader__scan_region canvas {
    position: absolute !important;
    width: 1px !important;
    height: 1px !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
  #qr-reader__status_span {
    color: rgba(255,255,255,0.4) !important;
    font-size: 11px !important;
  }
`;

const T = {
  bg:     '#0d0d0d',
  card:   '#141414',
  card2:  '#181818',
  border: 'rgba(255,255,255,0.07)',
  gold:   '#f59e0b',
  text:   'rgba(255,255,255,0.9)',
  muted:  'rgba(255,255,255,0.4)',
  green:  '#10b981',
  red:    '#ef4444',
};

export const ScannerPage = () => {
  const [status, setStatus]         = useState('idle');
  const [result, setResult]         = useState(null);
  const [venueId, setVenueId]       = useState(null);
  const [venueName, setVenueName]   = useState('');
  const [venueLoading, setVenueLoading] = useState(true);
  const [errorMsg, setErrorMsg]     = useState('');
  const [cameraError, setCameraError] = useState('');

  const scannerRef    = useRef(null);
  const lastScannedAt = useRef(0);
  const venueIdRef    = useRef(null);
  const processingRef = useRef(false);
  const navigate      = useNavigate();

  useEffect(() => {
    getMyVenue()
      .then((res) => {
        const venues = res.data?.venues || [];
        if (venues.length > 0) {
          venueIdRef.current = venues[0]._id;
          setVenueId(venues[0]._id);
          setVenueName(venues[0].name || '');
        }
      })
      .catch(console.error)
      .finally(() => setVenueLoading(false));
  }, []);

  useEffect(() => {
    if (!isSecureContext()) {
      setCameraError('Camera requires HTTPS...');
      return;
    }

    let cancelled = false;

    // ✅ ADD THIS — wipe any leftover video element from the previous mount
    const qrReaderEl = document.getElementById('qr-reader');
    if (qrReaderEl) qrReaderEl.innerHTML = '';

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    const localScanner = scanner;

    const config = {
      fps: 10,
      qrbox: { width: 220, height: 220 },
      aspectRatio: 1.0,
    };

    scanner.start(
      { facingMode: 'environment' },
      config,
      (decodedText) => {
        if (processingRef.current) return;
        const now = Date.now();
        if (now - lastScannedAt.current < SCAN_COOLDOWN_MS) return;
        lastScannedAt.current = now;
        processingRef.current = true;

        const currentVenueId = venueIdRef.current;
        if (!currentVenueId) {
          setErrorMsg('No venue assigned to your account. Contact admin.');
          setStatus('error');
          setTimeout(() => { if (!cancelled) { setStatus('idle'); setErrorMsg(''); processingRef.current = false; } }, 3500);
          return;
        }

        setStatus('scanning');
        scanQREntry({ qrCodeData: decodedText, venueId: currentVenueId })
          .then((res) => {
            if (cancelled) return;
            setResult(res.data);
            setStatus('success');
            setTimeout(() => { if (!cancelled) { setStatus('idle'); setResult(null); processingRef.current = false; } }, 5000);
          })
          .catch((err) => {
            const msg = err.response?.data?.error || 'Scan failed. Invalid or expired QR code.';
            if (cancelled) return;
            setErrorMsg(msg);
            setStatus('error');
            setTimeout(() => { if (!cancelled) { setStatus('idle'); setErrorMsg(''); processingRef.current = false; } }, 4000);
          });
      },
      () => {} // ignore scan failures (no QR in frame)
    ).catch((err) => {
      if (cancelled) return;
      console.error('Camera start failed:', err);
      if (err?.toString?.().includes('NotAllowedError') || err?.toString?.().includes('Permission')) {
        setCameraError('Camera access denied. Please allow camera permissions in your browser settings and reload.');
      } else if (err?.toString?.().includes('NotFoundError')) {
        setCameraError('No camera found. Please connect a camera and reload.');
      } else {
        setCameraError('Unable to start camera. Please check permissions and try again.');
      }
    });

    return () => {
      cancelled = true;
      scannerRef.current = null;
      try {
        // ✅ Only call stop() if the scanner is actually running
        if (localScanner.isScanning) {
          localScanner.stop().then(() => {
            localScanner.clear();
          }).catch(() => {});
        } else {
          localScanner.clear();
        }
      } catch (_) {}
    };
  }, []);

  const duplicate = result?.alreadyCheckedIn;
  const accent    = duplicate ? T.gold : T.green;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: T.bg, color: T.text }}>

      {/* Inject library overrides */}
      <style dangerouslySetInnerHTML={{ __html: SCANNER_CSS }} />

      {/* ── Header ── */}
      <div
        className="flex-shrink-0 flex items-center gap-3 px-4 py-4"
        style={{ borderBottom: `1px solid ${T.border}`, background: T.card }}
      >
        <button
          onClick={() => navigate('/venue')}
          className="rounded-xl p-2 transition-colors"
          style={{ background: 'rgba(255,255,255,0.06)', color: T.muted }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-base leading-tight" style={{ color: T.text }}>
            Scan Member QR
          </h1>
          {!venueLoading && venueName && (
            <p className="text-xs truncate mt-0.5" style={{ color: T.muted }}>{venueName}</p>
          )}
        </div>

        {/* Live indicator */}
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1"
          style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium" style={{ color: T.green }}>Live</span>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col max-w-md mx-auto w-full px-4 py-5 gap-4">

        {/* Venue loading state */}
        {venueLoading && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: T.card2, border: `1px solid ${T.border}` }}
          >
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" style={{ color: T.gold }} />
            <p className="text-sm" style={{ color: T.muted }}>Loading venue info…</p>
          </div>
        )}

        {/* Camera / HTTPS error */}
        {cameraError && (
          <div
            className="rounded-2xl p-5 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <Lock className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: T.red }}>Camera Unavailable</p>
              <p className="text-xs mt-1" style={{ color: T.muted }}>{cameraError}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 text-xs font-semibold px-4 py-2 rounded-lg"
                style={{ background: 'rgba(239,68,68,0.15)', color: T.red, border: '1px solid rgba(239,68,68,0.3)' }}
              >
                Reload Page
              </button>
            </div>
          </div>
        )}

        {/* No venue assigned */}
        {!venueLoading && !venueId && (
          <div
            className="rounded-2xl p-5 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: T.red }}>No Venue Assigned</p>
              <p className="text-xs mt-1" style={{ color: T.muted }}>
                Contact an admin to link a venue to your account before scanning.
              </p>
            </div>
          </div>
        )}

        {/* ── Status banners ── */}

        {/* Scanning spinner */}
        {status === 'scanning' && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(245,158,11,0.08)', border: `1px solid rgba(245,158,11,0.2)` }}
          >
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: T.gold }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: T.gold }}>Verifying member…</p>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>Checking membership status</p>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: T.red }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: T.red }}>Scan Failed</p>
              <p className="text-xs mt-0.5" style={{ color: T.muted }}>{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Success — member card */}
        {status === 'success' && result && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: T.card2, border: `1px solid ${duplicate ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)'}` }}
          >
            {/* Top bar */}
            <div
              className="flex items-center gap-2 px-4 py-2.5"
              style={{ background: duplicate ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)' }}
            >
              {duplicate
                ? <ScanLine className="w-4 h-4" style={{ color: accent }} />
                : <CheckCircle className="w-4 h-4" style={{ color: accent }} />
              }
              <p className="text-sm font-bold" style={{ color: accent }}>
                {duplicate ? 'Already Checked In Today' : 'Entry Logged Successfully'}
              </p>
            </div>

            {/* Member info */}
            <div className="flex items-center gap-4 px-4 py-4">
              {result.memberPhoto ? (
                <img
                  src={result.memberPhoto}
                  alt={result.memberName}
                  className="w-16 h-16 rounded-2xl object-cover flex-shrink-0"
                  style={{ border: `2px solid ${accent}` }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.05)', border: `2px solid ${accent}` }}
                >
                  <UserCheck className="w-7 h-7" style={{ color: accent }} />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg leading-tight truncate" style={{ color: T.text }}>
                  {result.memberName}
                </p>
                {result.membershipId && (
                  <p className="text-xs font-mono mt-1 truncate" style={{ color: T.muted }}>
                    {result.membershipId}
                  </p>
                )}
                <div
                  className="inline-flex items-center gap-1 mt-2 rounded-full px-2.5 py-0.5"
                  style={{ background: duplicate ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)' }}
                >
                  <span className="text-xs font-medium" style={{ color: accent }}>
                    {duplicate ? 'Repeat scan — no new entry' : 'Welcome to the venue!'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── QR Scanner ── */}
        {!cameraError && (
        <div
          className="rounded-2xl overflow-hidden flex-1"
          style={{
            background: '#000',
            border: `1px solid ${T.border}`,
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            minHeight: 360,
          }}
        >
          <div id="qr-reader" className="w-full" />
        </div>
        )}

        {/* Hint */}
        {!cameraError && !venueLoading && venueId && status === 'idle' && (
          <div
            className="rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: T.card2, border: `1px solid ${T.border}` }}
          >
            <Wifi className="w-4 h-4 flex-shrink-0" style={{ color: T.muted }} />
            <p className="text-xs leading-relaxed" style={{ color: T.muted }}>
              Point the camera at a member's{' '}
              <span style={{ color: T.gold }}>Kulty QR code</span>
              {' '}to log their entry. One check-in per venue per day.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

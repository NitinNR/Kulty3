import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import {
  ArrowLeft, CheckCircle, XCircle, Loader2,
  ScanLine, Wifi, UserCheck, AlertCircle,
} from 'lucide-react';
import { scanQREntry, getMyVenue } from '../../services/api';

const SCAN_COOLDOWN_MS = 3000;

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
  #qr-reader video { width: 100% !important; }

  #qr-reader__dashboard {
    padding: 14px 16px 10px !important;
    background: #181818 !important;
    border-top: 1px solid rgba(255,255,255,0.07) !important;
  }
  #qr-reader__dashboard_section { padding: 4px 0 !important; }
  #qr-reader__dashboard_section_csr > span { display: none !important; }

  #qr-reader__camera_permission_button,
  #qr-reader__camera_start_button,
  #qr-reader__camera_stop_button,
  #qr-reader__dashboard_section_swaplink {
    color: #f59e0b !important;
    background: rgba(245,158,11,0.1) !important;
    border: 1px solid rgba(245,158,11,0.3) !important;
    border-radius: 10px !important;
    padding: 9px 18px !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    width: 100% !important;
    margin: 4px 0 !important;
    transition: background 0.2s !important;
    letter-spacing: 0.02em !important;
  }
  #qr-reader__camera_permission_button:hover,
  #qr-reader__camera_start_button:hover,
  #qr-reader__camera_stop_button:hover {
    background: rgba(245,158,11,0.2) !important;
  }

  #qr-reader__camera_selection {
    color: #fff !important;
    background: #222 !important;
    border: 1px solid rgba(255,255,255,0.15) !important;
    border-radius: 10px !important;
    padding: 9px 12px !important;
    font-size: 13px !important;
    width: 100% !important;
    margin: 4px 0 !important;
    outline: none !important;
    -webkit-appearance: none !important;
    appearance: none !important;
    cursor: pointer !important;
  }
  #qr-reader__camera_selection option {
    background: #222 !important;
    color: #fff !important;
  }

  #qr-reader__status_span {
    color: rgba(255,255,255,0.4) !important;
    font-size: 11px !important;
  }
  #qr-reader__dashboard_section_fsr {
    display: none !important;
  }
  #qr-reader__header_message {
    color: rgba(255,255,255,0.4) !important;
    font-size: 11px !important;
    padding: 4px 0 !important;
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
  const scannerRef    = useRef(null);
  const lastScannedAt = useRef(0);
  const venueIdRef    = useRef(null);
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
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0, showTorchButtonIfSupported: true },
      false
    );

    const onScanSuccess = async (decodedText) => {
      const now = Date.now();
      if (now - lastScannedAt.current < SCAN_COOLDOWN_MS) return;
      lastScannedAt.current = now;

      const currentVenueId = venueIdRef.current;
      if (!currentVenueId) {
        setErrorMsg('No venue assigned to your account. Contact admin.');
        setStatus('error');
        setTimeout(() => { setStatus('idle'); setErrorMsg(''); }, 3500);
        return;
      }

      try {
        setStatus('scanning');
        const res = await scanQREntry({ qrCodeData: decodedText, venueId: currentVenueId });
        setResult(res.data);
        setStatus('success');
        setTimeout(() => { setStatus('idle'); setResult(null); }, 5000);
      } catch (err) {
        const msg = err.response?.data?.error || 'Scan failed. Invalid or expired QR code.';
        setErrorMsg(msg);
        setStatus('error');
        setTimeout(() => { setStatus('idle'); setErrorMsg(''); }, 4000);
      }
    };

    scanner.render(onScanSuccess, () => {});
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
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

        {/* Hint */}
        {!venueLoading && venueId && status === 'idle' && (
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

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { scanQREntry, getMyVenue } from '../../services/api';

const SCAN_COOLDOWN_MS = 3000;

const T = {
  bg: '#0d0d0d',
  card: '#141414',
  border: 'rgba(255,255,255,0.07)',
  gold: '#f59e0b',
  text: 'rgba(255,255,255,0.85)',
  muted: 'rgba(255,255,255,0.4)',
};

export const ScannerPage = () => {
  const [status, setStatus] = useState('idle'); // idle | scanning | success | error
  const [result, setResult] = useState(null);
  const [venueId, setVenueId] = useState(null);
  const [venueLoading, setVenueLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);
  const lastScannedAt = useRef(0);
  // Keep venueId in a ref so the scanner callback always reads the latest value
  // without needing to reinitialize the scanner when venueId changes
  const venueIdRef = useRef(null);
  const navigate = useNavigate();

  // Fetch venue owner's venue ID on mount
  useEffect(() => {
    getMyVenue()
      .then((res) => {
        const venues = res.data?.venues || [];
        if (venues.length > 0) {
          venueIdRef.current = venues[0]._id;
          setVenueId(venues[0]._id);
        }
      })
      .catch(console.error)
      .finally(() => setVenueLoading(false));
  }, []);

  // Initialize scanner ONCE on mount — read venueId from ref inside callback
  // so the closure never goes stale when venueId arrives asynchronously
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
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
        setTimeout(() => { setStatus('idle'); setErrorMsg(''); }, 3000);
        return;
      }

      try {
        setStatus('scanning');
        const res = await scanQREntry({ qrCodeData: decodedText, venueId: currentVenueId });
        setResult(res.data);
        setStatus('success');
        setTimeout(() => { setStatus('idle'); setResult(null); }, 4500);
      } catch (err) {
        const msg = err.response?.data?.error || 'Scan failed. Invalid or expired QR code.';
        setErrorMsg(msg);
        setStatus('error');
        setTimeout(() => { setStatus('idle'); setErrorMsg(''); }, 3500);
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
  }, []); // empty deps — init once, venueId read from ref

  return (
    <div className="min-h-screen" style={{ backgroundColor: T.bg, color: T.text }}>
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center gap-4"
        style={{ borderBottom: `1px solid ${T.border}` }}
      >
        <button
          onClick={() => navigate('/venue')}
          className="flex items-center justify-center rounded-lg transition"
          style={{ color: T.muted, padding: '6px' }}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold text-lg leading-none" style={{ color: T.text }}>Scan Member QR</h1>
          {!venueLoading && venueId && (
            <p className="text-xs mt-0.5" style={{ color: T.muted }}>Ready to scan</p>
          )}
        </div>
      </div>

      <div className="max-w-sm mx-auto px-4 py-8 space-y-5">
        {/* Status banners */}
        {status === 'success' && result && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}
          >
            <CheckCircle className="w-10 h-10 mx-auto mb-3" style={{ color: '#10b981' }} />
            <p className="font-bold text-lg" style={{ color: '#10b981' }}>Entry Logged!</p>
            {result.memberPhoto && (
              <img
                src={result.memberPhoto}
                alt={result.memberName}
                className="w-16 h-16 rounded-full object-cover mx-auto mt-3"
                style={{ border: '2px solid #10b981' }}
              />
            )}
            <p className="mt-3 font-bold text-xl" style={{ color: T.text }}>{result.memberName}</p>
            {result.membershipId && (
              <p className="text-xs font-mono mt-1" style={{ color: T.muted }}>{result.membershipId}</p>
            )}
            <p className="text-sm mt-2" style={{ color: 'rgba(16,185,129,0.7)' }}>Welcome to the venue!</p>
          </div>
        )}

        {status === 'error' && (
          <div
            className="rounded-2xl p-5 text-center"
            style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <XCircle className="w-8 h-8 mx-auto mb-2" style={{ color: '#ef4444' }} />
            <p className="font-medium" style={{ color: '#ef4444' }}>{errorMsg}</p>
          </div>
        )}

        {status === 'scanning' && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3"
            style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: `1px solid rgba(245,158,11,0.2)` }}
          >
            <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" style={{ color: T.gold }} />
            <p className="text-sm font-medium" style={{ color: T.gold }}>Verifying member…</p>
          </div>
        )}

        {/* Scanner container */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: '#000',
            border: `1px solid ${T.border}`,
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div id="qr-reader" className="w-full" />
        </div>

        {/* Footer hint */}
        {venueLoading ? (
          <p className="text-center text-xs" style={{ color: T.muted }}>
            <Loader2 className="w-3 h-3 inline animate-spin mr-1" />
            Loading venue info…
          </p>
        ) : !venueId ? (
          <p className="text-center text-xs" style={{ color: T.gold }}>
            No venue assigned — contact admin to link a venue to your account.
          </p>
        ) : (
          <p className="text-center text-xs" style={{ color: T.muted }}>
            Point the camera at a member's Kulty card QR code
          </p>
        )}
      </div>
    </div>
  );
};

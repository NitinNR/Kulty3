import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { scanQREntry, getMyVenue } from '../../services/api';

const SCAN_COOLDOWN_MS = 3000;

export const ScannerPage = () => {
  const [status, setStatus] = useState('idle'); // idle | scanning | success | error
  const [result, setResult] = useState(null);
  const [venueId, setVenueId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const scannerRef = useRef(null);
  const lastScannedAt = useRef(0);
  const navigate = useNavigate();

  // Fetch venue owner's venue ID on mount
  useEffect(() => {
    getMyVenue()
      .then((res) => {
        const venues = res.data?.venues || [];
        if (venues.length > 0) setVenueId(venues[0]._id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (scannerRef.current) return; // already initialized

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 260, height: 260 }, aspectRatio: 1.0 },
      false
    );

    const onScanSuccess = async (decodedText) => {
      const now = Date.now();
      if (now - lastScannedAt.current < SCAN_COOLDOWN_MS) return;
      lastScannedAt.current = now;

      if (!venueId) {
        setErrorMsg('No venue assigned to your account. Contact admin.');
        setStatus('error');
        return;
      }

      try {
        setStatus('scanning');
        const res = await scanQREntry({ qrCodeData: decodedText, venueId });
        setResult(res.data);
        setStatus('success');

        // Auto-reset after 4 seconds
        setTimeout(() => {
          setStatus('idle');
          setResult(null);
        }, 4000);
      } catch (err) {
        setErrorMsg(err.response?.data?.error || 'Scan failed. Invalid or expired QR code.');
        setStatus('error');
        setTimeout(() => {
          setStatus('idle');
          setErrorMsg('');
        }, 3000);
      }
    };

    const onScanError = () => {};

    scanner.render(onScanSuccess, onScanError);
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [venueId]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="px-6 py-4 flex items-center gap-4 border-b border-gray-800">
        <button onClick={() => navigate('/venue')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Scan Member QR</h1>
      </div>

      <div className="max-w-sm mx-auto px-4 py-10">
        {/* Success overlay */}
        {status === 'success' && result && (
          <div className="mb-6 bg-green-900 bg-opacity-50 border border-green-600 rounded-2xl p-6 text-center animate-fade-in">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-3" />
            <p className="text-green-300 font-semibold text-lg">Entry Logged!</p>
            {result.memberPhoto && (
              <img
                src={result.memberPhoto}
                alt={result.memberName}
                className="w-16 h-16 rounded-full object-cover mx-auto mt-3 ring-2 ring-green-500"
              />
            )}
            <p className="mt-3 text-white font-bold text-xl">{result.memberName}</p>
            <p className="text-green-400 text-sm mt-1">Welcome to the venue!</p>
          </div>
        )}

        {/* Error overlay */}
        {status === 'error' && (
          <div className="mb-6 bg-red-900 bg-opacity-50 border border-red-600 rounded-2xl p-5 text-center">
            <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-300 font-medium">{errorMsg}</p>
          </div>
        )}

        {/* Scanner */}
        <div className="rounded-2xl overflow-hidden bg-black shadow-2xl">
          <div id="qr-reader" className="w-full" />
        </div>

        <p className="text-center text-gray-400 text-sm mt-6">
          Point the camera at a member's Kulty3 card QR code
        </p>

        {!venueId && (
          <p className="text-center text-amber-400 text-xs mt-3">
            No venue assigned — contact admin to assign a venue to your account.
          </p>
        )}
      </div>
    </div>
  );
};

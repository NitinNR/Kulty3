import { useState } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { format } from 'date-fns';
import { X, Maximize2 } from 'lucide-react';

const BrandMark = ({ small = false }) => (
  <div className="flex items-center gap-1.5">
    <span style={{ fontSize: small ? '7px' : '9px', color: 'rgba(245,158,11,0.6)', lineHeight: 1 }}>◆</span>
    <span
      className="font-display font-bold"
      style={{
        fontSize: small ? '13px' : '16px',
        color: 'rgba(255,255,255,0.92)',
        letterSpacing: '0.16em',
      }}
    >
      KULTY
    </span>
  </div>
);

const Chip = () => (
  <div
    className="relative rounded flex-shrink-0"
    style={{
      width: '34px',
      height: '26px',
      background: 'linear-gradient(145deg, #e2c060 0%, #c08c1c 40%, #e8c854 70%, #b87c10 100%)',
      border: '1px solid rgba(180,130,0,0.4)',
      boxShadow: 'inset 0 1px 1px rgba(255,220,100,0.4)',
      borderRadius: '5px',
    }}
  >
    {[28, 52, 74].map((pct) => (
      <div key={pct} className="absolute"
        style={{ top: `${pct}%`, left: '12%', right: '12%', height: '0.5px', backgroundColor: 'rgba(100,60,0,0.25)' }} />
    ))}
    <div className="absolute"
      style={{ top: '18%', bottom: '18%', left: '50%', width: '0.5px', backgroundColor: 'rgba(100,60,0,0.2)' }} />
  </div>
);

const NFCIcon = () => (
  <div className="flex items-end gap-0.5" style={{ height: '18px' }}>
    {[7, 12, 17].map((size, i) => (
      <div key={i} style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        border: '1.5px solid rgba(245,158,11,0.4)',
        borderLeft: '1.5px solid transparent',
        borderBottom: '1.5px solid transparent',
        transform: 'rotate(-45deg)',
      }} />
    ))}
  </div>
);

const QRModal = ({ value, onClose }) => (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center px-6"
    style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
    onClick={onClose}
  >
    <div
      className="relative flex flex-col items-center gap-5 p-8 rounded-3xl w-full"
      style={{ backgroundColor: '#141414', border: '1px solid rgba(245,158,11,0.18)', maxWidth: '300px' }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
      >
        <X className="w-4 h-4" />
      </button>
      <BrandMark />
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#fff' }}>
        <QRCode value={value} size={210} level="H" includeMargin={false} fgColor="#0d0d0d" bgColor="#ffffff" />
      </div>
      <div className="text-center">
        <p className="font-bold tracking-[0.2em] mb-1" style={{ color: 'rgba(245,158,11,0.85)', fontSize: '11px' }}>
          SCAN TO ENTER
        </p>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px' }}>Show this at venue entry</p>
      </div>
    </div>
  </div>
);

export const MembershipCard = ({ user }) => {
  const [qrOpen, setQrOpen] = useState(false);
  const endDate = user?.subscription?.endDate ? new Date(user.subscription.endDate) : null;
  const qrValue = user?.qrCodeData || user?.membershipId || 'KULTY';

  const fmtId = (id = '') => {
    const raw = id.replace(/\s/g, '').replace(/^KULTY/i, '');
    const s   = raw.padEnd(8, '0').slice(0, 8);
    return `KULTY ${s.slice(0, 3)} ${s.slice(3, 6)} ${s.slice(6, 8)}`;
  };

  return (
    <>
      {qrOpen && <QRModal value={qrValue} onClose={() => setQrOpen(false)} />}

      <div
        className="w-full max-w-sm mx-auto select-none relative overflow-hidden"
        style={{
          aspectRatio: '1.586 / 1',
          borderRadius: '20px',
          background: 'linear-gradient(145deg, #131108 0%, #1e1a07 45%, #111009 100%)',
          boxShadow: '0 32px 64px rgba(0,0,0,0.75), 0 0 0 1px rgba(245,158,11,0.18)',
        }}
      >
        {/* Decorative concentric arcs — bottom-left */}
        <div className="absolute pointer-events-none" style={{ bottom: '-60px', left: '-60px' }}>
          {[130, 185, 245].map((size, i) => (
            <div key={size} className="absolute rounded-full" style={{
              width: `${size}px`,
              height: `${size}px`,
              border: `1px solid rgba(245,158,11,${0.09 - i * 0.025})`,
              bottom: 0,
              left: 0,
              transform: `translate(-${size / 2.5}px, ${size / 2.5}px)`,
            }} />
          ))}
        </div>

        {/* Subtle gold shimmer across top edge */}
        <div className="absolute pointer-events-none" style={{
          top: 0, left: '20%', right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(245,158,11,0.25), transparent)',
        }} />

        {/* Right-side glow */}
        <div className="absolute pointer-events-none" style={{
          top: '10%', right: 0, width: '120px', bottom: '10%',
          background: 'radial-gradient(ellipse at right, rgba(245,158,11,0.05) 0%, transparent 70%)',
        }} />

        {/* ── Card content ── */}
        <div className="absolute inset-0 flex flex-col justify-between p-5 sm:p-6">

          {/* Row 1 — Brand + tier */}
          <div className="flex items-center justify-between">
            <BrandMark />
            <span
              className="font-bold tracking-[0.18em]"
              style={{
                fontSize: '8px',
                color: 'rgba(245,158,11,0.7)',
                border: '1px solid rgba(245,158,11,0.22)',
                backgroundColor: 'rgba(245,158,11,0.06)',
                padding: '3px 8px',
                borderRadius: '999px',
              }}
            >
              PREMIUM PLUS
            </span>
          </div>

          {/* Row 2 — Chip + NFC + membership ID */}
          <div>
            <div className="flex items-center gap-2.5 mb-2.5">
              <Chip />
              <NFCIcon />
            </div>
            <p
              className="font-mono font-medium tracking-widest"
              style={{ color: 'rgba(255,255,255,0.45)', fontSize: 'clamp(10px, 2.5vw, 13px)' }}
            >
              {fmtId(user?.membershipId || 'KULTY 0000')}
            </p>
          </div>

          {/* Row 3 — Name + validity | QR */}
          <div className="flex items-end justify-between gap-3">

            {/* Name + valid thru */}
            <div className="min-w-0">
              <p
                className="font-bold text-white leading-none truncate uppercase"
                style={{ fontSize: 'clamp(14px, 4vw, 19px)', letterSpacing: '0.08em' }}
              >
                {user?.name || 'Member'}
              </p>
              <div className="mt-2 flex items-end gap-4">
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '8px', letterSpacing: '0.18em' }}>
                    VALID THRU
                  </p>
                  <p
                    className="font-semibold mt-0.5"
                    style={{ color: 'rgba(245,158,11,0.85)', fontSize: 'clamp(11px, 3vw, 14px)' }}
                  >
                    {endDate ? format(endDate, 'MM / yy') : '— / ——'}
                  </p>
                </div>
              </div>
            </div>

            {/* Mini QR — tap to enlarge */}
            <button
              onClick={() => setQrOpen(true)}
              className="group relative flex-shrink-0 rounded-xl transition-opacity active:opacity-75"
              style={{ padding: '5px', backgroundColor: '#fff' }}
            >
              <QRCode
                value={qrValue}
                size={58}
                level="H"
                includeMargin={false}
                fgColor="#0d0d0d"
                bgColor="#ffffff"
              />
              <div
                className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 group-active:opacity-100 transition"
                style={{ backgroundColor: 'rgba(0,0,0,0.42)' }}
              >
                <Maximize2 className="w-4 h-4 text-white" />
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

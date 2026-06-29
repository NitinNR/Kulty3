import { useState } from 'react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { format } from 'date-fns';
import { X, Maximize2 } from 'lucide-react';

const BrandMark = ({ small = false }) => (
  <div className="flex items-center gap-1.5">
    <span style={{ fontSize: small ? '7px' : '8px', color: 'rgba(245,158,11,0.5)', lineHeight: 1 }}>◆</span>
    <span
      className="font-display font-bold"
      style={{ fontSize: small ? '12px' : '14px', color: 'rgba(245,158,11,0.7)', letterSpacing: '0.14em' }}
    >
      KULTY
    </span>
  </div>
);

const QRModal = ({ value, onClose }) => (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center px-6"
    style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(10px)' }}
    onClick={onClose}
  >
    <div
      className="relative flex flex-col items-center gap-5 p-8 rounded-3xl w-full"
      style={{ backgroundColor: '#141414', border: '1px solid rgba(245,158,11,0.18)', maxWidth: '300px' }}
      onClick={e => e.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
      >
        <X className="w-4 h-4" />
      </button>
      <BrandMark />
      <div className="rounded-2xl p-4" style={{ backgroundColor: '#ffffff' }}>
        <QRCode value={value} size={210} level="H" includeMargin={false} fgColor="#0d0d0d" bgColor="#ffffff" />
      </div>
      <div className="text-center">
        <p className="font-bold tracking-[0.2em] mb-1" style={{ color: 'rgba(245,158,11,0.8)', fontSize: '11px' }}>
          SCAN TO ENTER
        </p>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: '11px' }}>Show this at venue entry</p>
      </div>
    </div>
  </div>
);

const Chip = () => (
  <div
    className="relative rounded flex-shrink-0"
    style={{
      width: '36px', height: '28px',
      background: 'linear-gradient(145deg, #e2c060 0%, #c08c1c 40%, #e8c854 70%, #b87c10 100%)',
      border: '1px solid rgba(180,130,0,0.4)',
      boxShadow: 'inset 0 1px 1px rgba(255,220,100,0.4)',
    }}
  >
    {[28, 50, 72].map((pct) => (
      <div key={pct} className="absolute"
        style={{ top: `${pct}%`, left: '12%', right: '12%', height: '0.5px', backgroundColor: 'rgba(100,60,0,0.25)' }} />
    ))}
    <div className="absolute"
      style={{ top: '18%', bottom: '18%', left: '50%', width: '0.5px', backgroundColor: 'rgba(100,60,0,0.2)' }} />
  </div>
);

const NFCIcon = () => (
  <div className="flex items-end gap-0.5" style={{ height: '20px' }}>
    {[8, 13, 18].map((size, i) => (
      <div key={i} style={{
        width: `${size}px`, height: `${size}px`,
        borderRadius: '50%',
        border: '1.5px solid rgba(245,158,11,0.45)',
        borderLeft: '1.5px solid transparent',
        borderBottom: '1.5px solid transparent',
        transform: 'rotate(-45deg)',
      }} />
    ))}
  </div>
);

export const MembershipCard = ({ user }) => {
  const [qrOpen, setQrOpen] = useState(false);
  const startDate = user?.subscription?.startDate ? new Date(user.subscription.startDate) : null;
  const endDate   = user?.subscription?.endDate   ? new Date(user.subscription.endDate)   : null;
  const qrValue   = user?.qrCodeData || user?.membershipId || 'KULTY';

  const fmtId = (id = '') => {
    const s = id.replace(/\s/g, '');
    return s.match(/.{1,4}/g)?.join(' ') || id;
  };

  const cardBg = {
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.18)',
    background: 'linear-gradient(145deg, #1a1408 0%, #0d0d0b 50%, #18140a 100%)',
  };

  return (
    <>
      {qrOpen && <QRModal value={qrValue} onClose={() => setQrOpen(false)} />}
      <div className="w-full max-w-xl mx-auto select-none shine-effect" style={cardBg}>

      {/* ── Desktop / tablet layout: horizontal ─────────────── */}
      <div className="hidden sm:flex" style={{ minHeight: '220px' }}>

        {/* Left panel */}
        <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden">
          {/* Decorative rings */}
          <div className="absolute pointer-events-none" style={{ bottom: '-60px', right: '-60px' }}>
            {[120, 160, 200, 240].map((size, i) => (
              <div key={size} className="absolute rounded-full" style={{
                width: `${size}px`, height: `${size}px`,
                border: `1px solid rgba(245,158,11,${0.08 - i * 0.015})`,
                bottom: 0, right: 0,
                transform: `translate(${size / 2.5}px, ${size / 2.5}px)`,
              }} />
            ))}
          </div>

          <div className="relative">
            <div className="flex items-start justify-between mb-5">
              <BrandMark />
              <span className="text-xs font-bold tracking-[0.2em] leading-none px-2.5 py-1.5 rounded-full"
                style={{ border: '1px solid rgba(245,158,11,0.3)', color: 'rgba(245,158,11,0.8)', backgroundColor: 'rgba(245,158,11,0.05)' }}>
                ANNUAL MEMBER
              </span>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <Chip /><NFCIcon />
            </div>

            <div className="flex items-center gap-3 mb-4">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt={user?.name}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  style={{ border: '1.5px solid rgba(245,158,11,0.35)' }} />
              ) : (
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1.5px solid rgba(245,158,11,0.3)' }}>
                  {user?.name?.[0]?.toUpperCase() || 'K'}
                </div>
              )}
              <div>
                <p className="font-bold text-white leading-none tracking-wide" style={{ fontSize: '17px' }}>
                  {user?.name || 'Member'}
                </p>
                <p className="text-xs font-semibold tracking-[0.18em] mt-1" style={{ color: 'rgba(245,158,11,0.65)' }}>
                  GOLD ELITE
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <p className="font-mono font-semibold tracking-[0.28em] mb-4"
              style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px' }}>
              {fmtId(user?.membershipId || 'KULTY 0000')}
            </p>
            <div className="flex gap-7">
              {startDate && (
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] mb-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    Member Since
                  </p>
                  <p className="text-xs font-semibold text-white">{format(startDate, 'MMM yyyy')}</p>
                </div>
              )}
              {endDate && (
                <div>
                  <p className="text-xs uppercase tracking-[0.15em] mb-0.5" style={{ color: 'rgba(255,255,255,0.28)' }}>
                    Valid Until
                  </p>
                  <p className="text-xs font-semibold text-white">{format(endDate, 'MMM yyyy')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right QR panel — clickable */}
        <button
          onClick={() => setQrOpen(true)}
          className="flex flex-col items-center justify-center gap-3 px-5 py-6 flex-shrink-0 group transition-opacity hover:opacity-90"
          style={{ width: '152px', borderLeft: '1px solid rgba(245,158,11,0.1)', background: 'rgba(0,0,0,0.25)' }}
        >
          <p className="text-xs font-bold tracking-[0.18em] text-center" style={{ color: 'rgba(245,158,11,0.65)' }}>
            SCAN TO<br />ENTER
          </p>
          <div className="rounded-xl p-2.5 relative" style={{ backgroundColor: '#fff' }}>
            <QRCode value={qrValue} size={100} level="H" includeMargin={false} fgColor="#0d0d0d" bgColor="#ffffff" />
            <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
              <Maximize2 className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="flex items-center gap-1 text-center leading-snug" style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px' }}>
            <Maximize2 className="w-2.5 h-2.5" /> Tap to enlarge
          </p>
        </button>
      </div>

      {/* ── Mobile layout: vertical stack ─────────────────────── */}
      <div className="flex flex-col sm:hidden">

        {/* Card face */}
        <div className="p-5 relative overflow-hidden">
          {/* Decorative rings */}
          <div className="absolute pointer-events-none" style={{ top: '-40px', right: '-40px' }}>
            {[100, 140, 180].map((size, i) => (
              <div key={size} className="absolute rounded-full" style={{
                width: `${size}px`, height: `${size}px`,
                border: `1px solid rgba(245,158,11,${0.07 - i * 0.015})`,
                top: 0, right: 0,
                transform: `translate(${size / 2.5}px, -${size / 2.5}px)`,
              }} />
            ))}
          </div>

          {/* Top row: brand + tier */}
          <div className="flex items-center justify-between mb-4">
            <BrandMark small />
            <span className="text-xs font-bold tracking-widest px-2 py-1 rounded-full"
              style={{ border: '1px solid rgba(245,158,11,0.3)', color: 'rgba(245,158,11,0.75)', backgroundColor: 'rgba(245,158,11,0.05)', fontSize: '9px' }}>
              ANNUAL MEMBER
            </span>
          </div>

          {/* Chip + user row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Chip /><NFCIcon />
            </div>
            <div className="flex items-center gap-2.5">
              {user?.profilePhoto ? (
                <img src={user.profilePhoto} alt={user?.name}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  style={{ border: '1.5px solid rgba(245,158,11,0.35)' }} />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1.5px solid rgba(245,158,11,0.3)' }}>
                  {user?.name?.[0]?.toUpperCase() || 'K'}
                </div>
              )}
              <div>
                <p className="font-bold text-white leading-none" style={{ fontSize: '14px' }}>
                  {user?.name || 'Member'}
                </p>
                <p className="text-xs font-semibold tracking-[0.14em] mt-0.5" style={{ color: 'rgba(245,158,11,0.65)', fontSize: '9px' }}>
                  GOLD ELITE
                </p>
              </div>
            </div>
          </div>

          {/* Member ID */}
          <p className="font-mono font-semibold mb-3"
            style={{ color: 'rgba(255,255,255,0.85)', fontSize: '12px', letterSpacing: '0.2em' }}>
            {fmtId(user?.membershipId || 'KULTY 0000')}
          </p>

          {/* Dates */}
          <div className="flex gap-6">
            {startDate && (
              <div>
                <p className="text-xs uppercase tracking-[0.12em] mb-0.5" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>
                  Since
                </p>
                <p className="font-semibold text-white" style={{ fontSize: '11px' }}>{format(startDate, 'MMM yyyy')}</p>
              </div>
            )}
            {endDate && (
              <div>
                <p className="text-xs uppercase tracking-[0.12em] mb-0.5" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>
                  Valid Until
                </p>
                <p className="font-semibold text-white" style={{ fontSize: '11px' }}>{format(endDate, 'MMM yyyy')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Mobile QR strip — clickable */}
        <button
          onClick={() => setQrOpen(true)}
          className="flex items-center justify-between gap-4 px-5 py-4 w-full group"
          style={{ borderTop: '1px solid rgba(245,158,11,0.1)', background: 'rgba(0,0,0,0.3)' }}
        >
          <div className="text-left">
            <p className="font-bold tracking-[0.18em] mb-1" style={{ color: 'rgba(245,158,11,0.7)', fontSize: '10px' }}>
              SCAN TO ENTER
            </p>
            <p className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '9px' }}>
              <Maximize2 className="w-2.5 h-2.5" /> Tap to enlarge
            </p>
          </div>
          <div className="rounded-xl p-2 relative flex-shrink-0" style={{ backgroundColor: '#fff' }}>
            <QRCode value={qrValue} size={80} level="H" includeMargin={false} fgColor="#0d0d0d" bgColor="#ffffff" />
            <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-active:opacity-100 transition"
              style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}>
              <Maximize2 className="w-4 h-4 text-white" />
            </div>
          </div>
        </button>
      </div>
      </div>
    </>
  );
};

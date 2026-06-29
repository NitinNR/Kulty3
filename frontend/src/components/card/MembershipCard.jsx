import { QRCodeSVG as QRCode } from 'qrcode.react';
import { format } from 'date-fns';

// ── Gold EMV chip ────────────────────────────────────────────────────────────
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
    {/* Horizontal score lines */}
    {[28, 50, 72].map((pct) => (
      <div key={pct} className="absolute" style={{ top: `${pct}%`, left: '12%', right: '12%', height: '0.5px', backgroundColor: 'rgba(100,60,0,0.25)' }} />
    ))}
    {/* Vertical center line */}
    <div className="absolute" style={{ top: '18%', bottom: '18%', left: '50%', width: '0.5px', backgroundColor: 'rgba(100,60,0,0.2)' }} />
  </div>
);

// ── NFC radio-arc icon ───────────────────────────────────────────────────────
const NFCIcon = () => (
  <div className="flex items-end gap-0.5" style={{ height: '20px' }}>
    {[8, 13, 18].map((size, i) => (
      <div
        key={i}
        style={{
          width: `${size}px`, height: `${size}px`,
          borderRadius: '50%',
          border: '1.5px solid rgba(245,158,11,0.45)',
          borderLeft: '1.5px solid transparent',
          borderBottom: '1.5px solid transparent',
          transform: 'rotate(-45deg)',
        }}
      />
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const MembershipCard = ({ user }) => {
  const startDate = user?.subscription?.startDate ? new Date(user.subscription.startDate) : null;
  const endDate   = user?.subscription?.endDate   ? new Date(user.subscription.endDate)   : null;
  const qrValue   = user?.qrCodeData || user?.membershipId || 'KULTY';

  // Format membership ID with spaces every 4 chars for visual rhythm
  const fmtId = (id = '') => {
    const s = id.replace(/\s/g, '');
    return s.match(/.{1,4}/g)?.join(' ') || id;
  };

  return (
    <div
      className="w-full max-w-xl mx-auto select-none shine-effect"
      style={{
        borderRadius: '20px',
        overflow: 'hidden',
        boxShadow: '0 32px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(245,158,11,0.18)',
        background: 'linear-gradient(145deg, #1a1408 0%, #0d0d0b 50%, #18140a 100%)',
      }}
    >
      <div className="flex" style={{ minHeight: '220px' }}>

        {/* ══ LEFT — card face ══════════════════════════════════════════════ */}
        <div className="flex-1 flex flex-col justify-between p-6 relative overflow-hidden">

          {/* Decorative concentric rings — positioned bottom-right of left panel */}
          <div className="absolute pointer-events-none" style={{ bottom: '-60px', right: '-60px' }}>
            {[120, 160, 200, 240].map((size, i) => (
              <div
                key={size}
                className="absolute rounded-full"
                style={{
                  width: `${size}px`, height: `${size}px`,
                  border: `1px solid rgba(245,158,11,${0.08 - i * 0.015})`,
                  bottom: 0, right: 0,
                  transform: `translate(${size / 2.5}px, ${size / 2.5}px)`,
                }}
              />
            ))}
          </div>

          {/* ── Top row ── */}
          <div className="relative">
            <div className="flex items-start justify-between mb-5">
              {/* Brand */}
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#f59e0b' }}
                >
                  <span className="text-xs font-bold" style={{ color: '#0d0d0d' }}>K</span>
                </div>
                <span
                  className="font-display font-bold text-lg leading-none"
                  style={{ color: '#f59e0b' }}
                >
                  Kulty
                </span>
              </div>

              {/* Tier badge */}
              <span
                className="text-xs font-bold tracking-[0.2em] leading-none px-2.5 py-1.5 rounded-full"
                style={{
                  border: '1px solid rgba(245,158,11,0.3)',
                  color: 'rgba(245,158,11,0.8)',
                  backgroundColor: 'rgba(245,158,11,0.05)',
                }}
              >
                ANNUAL MEMBER
              </span>
            </div>

            {/* Chip + NFC row */}
            <div className="flex items-center gap-3 mb-5">
              <Chip />
              <NFCIcon />
            </div>

            {/* Profile + name */}
            <div className="flex items-center gap-3 mb-4">
              {user?.profilePhoto ? (
                <img
                  src={user.profilePhoto}
                  alt={user?.name}
                  className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  style={{ border: '1.5px solid rgba(245,158,11,0.35)' }}
                />
              ) : (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                  style={{ backgroundColor: 'rgba(245,158,11,0.15)', color: '#f59e0b', border: '1.5px solid rgba(245,158,11,0.3)' }}
                >
                  {user?.name?.[0]?.toUpperCase() || 'K'}
                </div>
              )}
              <div>
                <p
                  className="font-bold text-white leading-none tracking-wide"
                  style={{ fontSize: '17px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
                >
                  {user?.name || 'Member'}
                </p>
                <p
                  className="text-xs font-semibold tracking-[0.18em] mt-1"
                  style={{ color: 'rgba(245,158,11,0.65)' }}
                >
                  GOLD ELITE
                </p>
              </div>
            </div>
          </div>

          {/* ── Bottom row ── */}
          <div className="relative">
            {/* Member ID */}
            <p
              className="font-mono font-semibold tracking-[0.28em] mb-4"
              style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', letterSpacing: '0.25em' }}
            >
              {fmtId(user?.membershipId || 'KULTY 0000')}
            </p>

            {/* Dates */}
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

        {/* ══ RIGHT — QR panel ════════════════════════════════════════════════ */}
        <div
          className="flex flex-col items-center justify-center gap-3 px-5 py-6 flex-shrink-0"
          style={{
            width: '152px',
            borderLeft: '1px solid rgba(245,158,11,0.1)',
            background: 'rgba(0,0,0,0.25)',
          }}
        >
          <p
            className="text-xs font-bold tracking-[0.18em] text-center"
            style={{ color: 'rgba(245,158,11,0.65)' }}
          >
            SCAN TO<br />ENTER
          </p>

          {/* QR code */}
          <div
            className="rounded-xl p-2.5"
            style={{ backgroundColor: '#fff' }}
          >
            <QRCode
              value={qrValue}
              size={100}
              level="H"
              includeMargin={false}
              fgColor="#0d0d0d"
              bgColor="#ffffff"
            />
          </div>

          <p
            className="text-xs text-center leading-snug"
            style={{ color: 'rgba(255,255,255,0.22)', fontSize: '10px' }}
          >
            Show at<br />venue entry
          </p>
        </div>
      </div>
    </div>
  );
};

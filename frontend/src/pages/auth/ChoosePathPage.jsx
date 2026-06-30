import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Building2, Check } from 'lucide-react';
import { updateProfile } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/common/Spinner';

const T = {
  bg:     '#0d0d0d',
  card:   '#141414',
  lite:   '#1c1c1c',
  border: 'rgba(255,255,255,0.08)',
  text:   'rgba(255,255,255,0.88)',
  muted:  'rgba(255,255,255,0.4)',
  dim:    'rgba(255,255,255,0.2)',
  gold:   '#f59e0b',
};

const MEMBER_BENEFITS = [
  'Annual digital membership card with QR',
  'Exclusive access to premium partner venues',
  'Cashback rewards on every bill you upload',
  'Member-only events and experiences',
  'Priority support',
];

const VENUE_BENEFITS = [
  'Free registration — no membership fee',
  'Web portal to scan member QR codes',
  'Log and track every member visit',
  'Review and approve member bill uploads',
  'Manage your venue details and staff',
];

const PathCard = ({ icon: Icon, title, subtitle, benefits, cta, ctaNote, highlighted, onClick, loading }) => (
  <div
    className="flex flex-col rounded-2xl p-7"
    style={{
      backgroundColor: T.card,
      border: `1px solid ${highlighted ? 'rgba(245,158,11,0.35)' : T.border}`,
      boxShadow: highlighted ? '0 0 0 1px rgba(245,158,11,0.12), 0 8px 32px rgba(245,158,11,0.06)' : 'none',
    }}
  >
    {/* Icon */}
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 flex-shrink-0"
      style={{ backgroundColor: highlighted ? 'rgba(245,158,11,0.12)' : T.lite }}
    >
      <Icon className="w-5 h-5" style={{ color: highlighted ? T.gold : T.muted }} />
    </div>

    {highlighted && (
      <span
        className="self-start text-xs font-bold tracking-[0.15em] px-2.5 py-1 rounded-full mb-3"
        style={{ backgroundColor: 'rgba(245,158,11,0.12)', color: T.gold, border: '1px solid rgba(245,158,11,0.2)' }}
      >
        FREE TO JOIN
      </span>
    )}

    <h2 className="text-lg font-bold mb-1.5" style={{ color: T.text }}>{title}</h2>
    <p className="text-sm mb-6 leading-relaxed" style={{ color: T.muted }}>{subtitle}</p>

    <ul className="space-y-3 mb-8 flex-1">
      {benefits.map((b) => (
        <li key={b} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
          <div
            className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
            style={{ backgroundColor: 'rgba(16,185,129,0.15)' }}
          >
            <Check className="w-2.5 h-2.5" style={{ color: '#10b981' }} />
          </div>
          {b}
        </li>
      ))}
    </ul>

    {ctaNote && (
      <p className="text-xs text-center mb-3" style={{ color: T.dim }}>{ctaNote}</p>
    )}

    <button
      onClick={onClick}
      disabled={loading}
      className="w-full py-3.5 rounded-xl font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
      style={
        highlighted
          ? { backgroundColor: T.gold, color: '#0d0d0d' }
          : { backgroundColor: T.lite, color: T.text, border: `1px solid ${T.border}` }
      }
    >
      {loading ? <Spinner size="sm" /> : cta}
    </button>
  </div>
);

export const ChoosePathPage = () => {
  const [choosing, setChoosing] = useState(null);
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const handleChoose = async (intent) => {
    setChoosing(intent);
    try {
      await updateProfile({ intentRole: intent });
      await refreshProfile();
      navigate(intent === 'member' ? '/payment' : '/apply-venue', { replace: true });
    } catch (err) {
      console.error(err);
      setChoosing(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ backgroundColor: T.bg }}>
      <div className="w-full max-w-3xl">

        {/* Brand */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1.5 mb-5">
            <span style={{ fontSize: '9px', color: 'rgba(245,158,11,0.55)', lineHeight: 1 }}>◆</span>
            <span
              className="font-display font-bold"
              style={{ fontSize: '22px', color: T.text, letterSpacing: '0.16em' }}
            >
              KULTY
            </span>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: T.text }}>How would you like to join?</h1>
          <p className="text-sm" style={{ color: T.muted }}>Choose your path to get started</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <PathCard
            icon={CreditCard}
            title="Join as Member"
            subtitle="Get an annual membership, discover premium venues, and earn cashback on every visit."
            benefits={MEMBER_BENEFITS}
            cta="Join as Member — ₹999/yr"
            ctaNote="Annual subscription required"
            highlighted={false}
            loading={choosing === 'member'}
            onClick={() => handleChoose('member')}
          />
          <PathCard
            icon={Building2}
            title="List my Venue"
            subtitle="Register your restaurant, club, or lounge and manage Kulty member visits and cashbacks."
            benefits={VENUE_BENEFITS}
            cta="Apply as Venue Owner — Free"
            ctaNote="Requires admin approval · Usually 24–48 hrs"
            highlighted={true}
            loading={choosing === 'venue_owner'}
            onClick={() => handleChoose('venue_owner')}
          />
        </div>

        <p className="text-center text-xs mt-8" style={{ color: T.dim }}>
          You can always contact us if you need to switch paths later.
        </p>
      </div>
    </div>
  );
};

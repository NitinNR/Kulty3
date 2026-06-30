import { useNavigate } from 'react-router-dom';
import { Download, Home, Ticket, Coins, PartyPopper, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';
import { MembershipCard } from '../../components/card/MembershipCard';
import { Navbar } from '../../components/layout/Navbar';
import { BottomNav } from '../../components/layout/BottomNav';
import { useAuth } from '../../hooks/useAuth';

const T = {
  bg:       '#0d0d0d',
  card:     '#141414',
  cardLite: '#1c1c1c',
  border:   'rgba(255,255,255,0.07)',
  sub:      'rgba(255,255,255,0.55)',
  dim:      'rgba(255,255,255,0.22)',
  gold:     '#f59e0b',
};

const PERKS = [
  { icon: Ticket,      emoji: '🎫', title: 'Venue Access',      desc: 'Exclusive entry to premium member-only venues across the city' },
  { icon: Coins,       emoji: '💰', title: 'Cashback Rewards',   desc: 'Earn cashback on every bill you upload at partner venues'      },
  { icon: PartyPopper, emoji: '🎉', title: 'Special Events',     desc: 'Member-only events, curated experiences, and priority seats'   },
  { icon: ShieldCheck, emoji: '🛡️', title: 'Priority Support',   desc: 'Dedicated support line for members, always first in queue'     },
];

export const CardPage = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  const handleDownloadCard = () => {
    // Grab the QR SVG element and build a download link
    const svg = document.querySelector('#card-to-download svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kulty-Card-${profile?.membershipId || 'member'}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isActive = profile?.subscription?.status === 'active';

  return (
    <div className="min-h-screen flex flex-col pb-20 md:pb-0" style={{ backgroundColor: T.bg }}>
      <Navbar />

      <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="font-display font-bold text-white mb-2"
            style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)' }}
          >
            {isActive ? 'Your Membership Card' : 'Membership Card'}
          </h1>
          <p className="text-sm" style={{ color: T.sub }}>
            {isActive
              ? 'Show this at any partner venue for priority entry and cashback'
              : 'Activate your membership to get a premium digital card'}
          </p>
        </div>

        {/* Inactive — upgrade prompt */}
        {!isActive && (
          <div
            className="max-w-sm mx-auto rounded-2xl p-6 mb-10 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1a1200 0%, #141414 100%)',
              border: '1px solid rgba(245,158,11,0.3)',
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, transparent, #f59e0b55, transparent)' }}
            />
            <Sparkles className="w-10 h-10 mx-auto mb-4" style={{ color: T.gold }} />
            <h2 className="font-bold text-lg text-white mb-2">Get Your Kulty Card</h2>
            <p className="text-sm mb-5" style={{ color: T.sub }}>
              Unlock your digital membership card, cashback on bills, and exclusive venue access.
            </p>
            <div className="font-bold text-3xl text-white mb-1">₹999<span className="text-base font-normal" style={{ color: T.sub }}>/year</span></div>
            <p className="text-xs mb-6" style={{ color: 'rgba(255,255,255,0.3)' }}>Billed annually</p>
            <button
              onClick={() => navigate('/payment')}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-opacity hover:opacity-90"
              style={{ background: T.gold, color: '#0d0d0d' }}
            >
              Activate Membership
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active — card + actions */}
        {isActive && (
          <>
            {/* Card with subtle glow */}
            <div id="card-to-download" className="mb-8 px-1" style={{ filter: 'drop-shadow(0 0 40px rgba(245,158,11,0.12))' }}>
              <MembershipCard user={profile} />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mb-12 max-w-sm mx-auto">
              <button
                onClick={handleDownloadCard}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 active:opacity-70"
                style={{ backgroundColor: T.gold, color: '#0d0d0d' }}
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => navigate('/home')}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80 active:opacity-70"
                style={{ backgroundColor: T.cardLite, color: 'rgba(255,255,255,0.8)', border: `1px solid ${T.border}` }}
              >
                <Home className="w-4 h-4" />
                Explore
              </button>
            </div>
          </>
        )}

        {/* Perks divider */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px" style={{ backgroundColor: T.border }} />
          <span className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: T.dim }}>
            Your Benefits
          </span>
          <div className="flex-1 h-px" style={{ backgroundColor: T.border }} />
        </div>

        {/* Perks grid */}
        <div className="grid grid-cols-2 gap-4">
          {PERKS.map(({ emoji, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl p-5"
              style={{ backgroundColor: T.card, border: `1px solid ${T.border}` }}
            >
              <span className="text-2xl mb-3 block">{emoji}</span>
              <h3 className="text-sm font-semibold text-white mb-1.5">{title}</h3>
              <p className="text-xs leading-relaxed" style={{ color: T.sub }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

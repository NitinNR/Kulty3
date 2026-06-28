import { QRCodeSVG as QRCode } from 'qrcode.react';
import { format } from 'date-fns';
import { ShieldCheck } from 'lucide-react';

export const MembershipCard = ({ user }) => {
  const endDate = user?.subscription?.endDate
    ? new Date(user.subscription.endDate)
    : null;

  const qrValue = user?.qrCodeData || user?.membershipId || 'KULTY';

  return (
    <div className="w-full max-w-sm mx-auto select-none">
      {/* Card header — credit card style */}
      <div className="gradient-card shine-effect rounded-t-2xl px-8 pt-8 pb-6 text-white shadow-2xl relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-4 right-4 w-40 h-40 rounded-full border-4 border-white" />
          <div className="absolute top-12 right-12 w-24 h-24 rounded-full border-4 border-white" />
        </div>

        <div className="relative z-10">
          {/* Top row: branding + photo */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <p className="text-xs opacity-60 uppercase tracking-widest mb-1">Kulty3</p>
              <p className="text-xs opacity-50 uppercase tracking-wider">Annual Member</p>
            </div>
            {user?.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user?.name}
                className="w-12 h-12 rounded-full object-cover border-2 border-white border-opacity-40 shadow-md"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-lg font-bold">
                {user?.name?.[0]?.toUpperCase() || 'K'}
              </div>
            )}
          </div>

          {/* Member name */}
          <h2 className="text-2xl font-display font-bold mb-6 tracking-wide">
            {user?.name || 'Member'}
          </h2>

          {/* Details row */}
          <div className="border-t border-white border-opacity-20 pt-4 flex justify-between items-end">
            <div>
              <p className="text-xs opacity-50 uppercase tracking-wider mb-0.5">Member ID</p>
              <p className="text-sm font-mono font-bold tracking-widest">
                {user?.membershipId || '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-50 uppercase tracking-wider mb-0.5">Valid Until</p>
              <p className="text-sm font-semibold">
                {endDate ? format(endDate, 'MMM yyyy') : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* QR panel — separated and prominent */}
      <div className="bg-white rounded-b-2xl shadow-2xl px-8 py-7 text-center">
        <div className="flex items-center justify-center gap-2 mb-5">
          <ShieldCheck className="w-4 h-4 text-green-500" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Show at venue entry
          </p>
        </div>

        <div className="inline-block p-4 rounded-2xl bg-gray-50 border border-gray-100 shadow-inner">
          <QRCode
            value={qrValue}
            size={180}
            level="H"
            includeMargin={false}
            fgColor="#0f172a"
            bgColor="#f9fafb"
          />
        </div>

        <p className="text-xs text-gray-400 mt-4">
          Venue staff will scan this to log your visit
        </p>
      </div>
    </div>
  );
};

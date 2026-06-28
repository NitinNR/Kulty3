import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, FileText } from 'lucide-react';
import { getMyVenue, getVenueEntries } from '../../services/api';
import { Spinner } from '../../components/common/Spinner';
import { format } from 'date-fns';

export const VenueEntriesPage = () => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [venueId, setVenueId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const venueRes = await getMyVenue();
        const venues = venueRes.data?.venues || [];
        if (!venues.length) { setLoading(false); return; }
        const id = venues[0]._id;
        setVenueId(id);
        const res = await getVenueEntries(id);
        setEntries(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const billSummary = (bills = []) => {
    const pending = bills.filter((b) => b.status === 'pending').length;
    const approved = bills.filter((b) => b.status === 'approved').length;
    return { pending, approved, total: bills.length };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gray-900 text-white px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate('/venue')} className="hover:text-gray-400 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold">Entry Logs</h1>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No entries yet. Start scanning member cards.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 mb-4">{entries.length} total check-ins</p>
            {entries.map((entry) => {
              const { pending, approved, total } = billSummary(entry.bills);
              return (
                <div key={entry._id} className="bg-white rounded-xl shadow-sm p-5 flex items-start gap-4">
                  {entry.userId?.profilePhoto ? (
                    <img
                      src={entry.userId.profilePhoto}
                      alt={entry.userId.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm">
                      {entry.userId?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{entry.userId?.name || 'Unknown'}</p>
                        <p className="text-xs text-gray-400 font-mono">{entry.userId?.membershipId}</p>
                      </div>
                      <p className="text-xs text-gray-400">
                        {format(new Date(entry.scannedAt), 'dd MMM, hh:mm a')}
                      </p>
                    </div>
                    {total > 0 && (
                      <div className="mt-2 flex items-center gap-3 text-xs">
                        <span className="flex items-center gap-1 text-gray-500">
                          <FileText className="w-3 h-3" /> {total} bill{total > 1 ? 's' : ''}
                        </span>
                        {pending > 0 && (
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                            {pending} pending
                          </span>
                        )}
                        {approved > 0 && (
                          <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                            {approved} approved
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
